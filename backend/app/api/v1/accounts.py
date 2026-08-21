from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.account import AccountWorkflowStage, AccountStageHistory
from app.models.general_company import GeneralCompany
from app.schemas.account import (
    AccountListPage,
    AccountDetail,
    AccountStageCreate,
    AccountStageUpdate,
    AccountStageResponse,
    AccountStageSnapshot,
    AccountReorderRequest,
    AccountHistoryItem,
)
from app.services import account_service, general_company_service
from app.services import account_templates
from app.services.account_service import ConcurrencyConflict
from app.schemas.general_company import GeneralCompanyCreate

router = APIRouter(prefix="/accounts", tags=["accounts"])


async def _assert_can_edit(db: AsyncSession, company_key: str, user) -> None:
    """First editor claims the account; afterwards only the owner or an admin may edit."""
    await account_service.claim_owner_if_unset(db, company_key, user)
    owner_id, _ = await account_service.get_owner(db, company_key)
    if not account_service.can_edit(user, owner_id):
        raise HTTPException(status_code=403, detail="You are not the owner of this account")


@router.get("", response_model=AccountListPage)
async def list_accounts(
    page: int = Query(1),
    page_size: int = Query(30),
    q: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await account_service.list_accounts(db, page=page, page_size=page_size, q=q)


@router.get("/{company_key}", response_model=AccountDetail)
async def get_account(
    company_key: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    account = await account_service.get_account(db, company_key)
    if not account:
        raise HTTPException(status_code=404, detail="Company not found")
    return account


@router.get("/templates/list", response_model=list)
async def list_templates(user=Depends(get_current_user)):
    """Return the built-in workflow templates (stage names + suggested fields)."""
    return account_templates.list_templates()


class ApplyTemplateRequest(BaseModel):
    template_key: str


@router.post("/{company_key}/stages/template", status_code=200)
async def apply_template(
    company_key: str,
    data: ApplyTemplateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create the stages from a built-in template for this account.

    Stages already present (matched by name) are skipped so applying a template
    twice does not duplicate steps."""
    template = account_templates.get_template(data.template_key)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await _assert_can_edit(db, company_key, user)

    existing = await db.execute(
        select(AccountWorkflowStage).where(AccountWorkflowStage.company_key == company_key)
    )
    existing_names = {s.name for s in existing.scalars().all()}

    created: list[str] = []
    for index, stage in enumerate(template.stages):
        if stage.name in existing_names:
            continue
        await account_service.create_stage(
            db,
            company_key,
            AccountStageCreate(
                name=stage.name,
                status=stage.status,
                objective=stage.objective,
                data=dict(stage.data),
                order_index=index,
            ),
            user.name,
        )
        created.append(stage.name)
    return {"created": created, "imported_count": len(created)}


class AccountImportItem(BaseModel):
    company_key: str
    name: str
    location: str | None = None


class AccountImportRequest(BaseModel):
    companies: list[AccountImportItem]


class AccountExistsRequest(BaseModel):
    names: list[str]


@router.post("/exists", status_code=200)
async def accounts_exists(
    data: AccountExistsRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Return the subset of the given names that already exist as Accounts."""
    lowered = [n.strip().lower() for n in data.names if n.strip()]
    if not lowered:
        return {"existing": []}
    result = await db.execute(
        select(func.lower(GeneralCompany.name)).where(func.lower(GeneralCompany.name).in_(lowered))
    )
    return {"existing": [row[0] for row in result.all()]}


@router.post("/import", status_code=200)
async def import_companies(
    data: AccountImportRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Import CDSCO/S-FDA companies into Accounts as general companies.

    Companies that already exist (matched by name) are skipped so the same
    source company is never duplicated. Imported companies immediately appear
    in the Accounts list and can be given a sales-process workflow."""
    created: list[str] = []
    skipped: list[str] = []
    for item in data.companies:
        name = (item.name or "").strip()
        if not name:
            continue
        existing = await general_company_service.get_general_company_by_name(db, name)
        if existing:
            skipped.append(name)
            continue
        await general_company_service.create_general_company(
            db,
            GeneralCompanyCreate(
                name=name,
                company_key=item.company_key,
                location=(item.location or "").strip() or None,
                source="cdsco",
            ),
            user,
        )
        created.append(name)
    return {"created": created, "skipped": skipped, "imported_count": len(created)}


@router.post("/{company_key}/stages", response_model=AccountStageResponse, status_code=201)
async def create_stage(
    company_key: str,
    data: AccountStageCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if not data.name.strip():
        raise HTTPException(status_code=422, detail="Stage name is required")
    if data.status not in account_service.STAGE_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Use one of: {account_service.STAGE_STATUSES}")
    await _assert_can_edit(db, company_key, user)
    stage = await account_service.create_stage(db, company_key, data, user.name)
    return await _stage_with_history(db, stage.id, company_key)


@router.patch("/{company_key}/stages/{stage_id}", response_model=AccountStageResponse)
async def update_stage(
    company_key: str,
    stage_id: str,
    data: AccountStageUpdate,
    expected_version: int | None = Query(None, description="Reject if the stage changed since it was loaded"),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if data.status is not None and data.status not in account_service.STAGE_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Use one of: {account_service.STAGE_STATUSES}")
    await _assert_can_edit(db, company_key, user)
    try:
        stage = await account_service.update_stage(
            db, company_key, stage_id, data, user.name, expected_version=expected_version
        )
    except ConcurrencyConflict:
        raise HTTPException(
            status_code=409,
            detail="This stage was edited by someone else. Reload to see the latest version.",
        )
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    return await _stage_with_history(db, stage.id, company_key)


@router.post("/{company_key}/stages/reorder", status_code=200)
async def reorder_stages(
    company_key: str,
    data: AccountReorderRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await _assert_can_edit(db, company_key, user)
    ok = await account_service.reorder_stages(db, company_key, data.ordered_ids)
    if not ok:
        raise HTTPException(status_code=404, detail="No stages found for this company")
    return {"status": "ok"}


@router.delete("/{company_key}/stages/{stage_id}", status_code=200)
async def delete_stage(
    company_key: str,
    stage_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await _assert_can_edit(db, company_key, user)
    deleted = await account_service.delete_stage(db, company_key, stage_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Stage not found")
    return {"status": "deleted"}


@router.get("/history/latest", response_model=list[AccountHistoryItem])
async def latest_global_history(
    limit: int = Query(5),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = await account_service.get_global_history(db, limit)
    return [
        AccountHistoryItem(
            id=h.id,
            stage_id=h.stage_id,
            stage_name=h.name,
            actor_name=h.actor_name,
            status=h.status,
            created_at=h.created_at,
            company_key=h.stage.company_key if h.stage else None,
        )
        for h in rows
    ]



@router.get("/{company_key}/history", response_model=list[AccountHistoryItem])
async def account_history(
    company_key: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = await account_service.get_history(db, company_key)
    return [
        AccountHistoryItem(
            id=h.id,
            stage_id=h.stage_id,
            stage_name=h.name,
            actor_name=h.actor_name,
            status=h.status,
            created_at=h.created_at,
        )
        for h in rows
    ]


class OwnerTransferRequest(BaseModel):
    owner_id: str
    owner_email: str


@router.patch("/{company_key}/owner", status_code=200)
async def transfer_owner(
    company_key: str,
    data: OwnerTransferRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Reassign the account owner. Allowed for the current owner or an admin."""
    owner_id, _ = await account_service.get_owner(db, company_key)
    if not account_service.can_edit(user, owner_id):
        raise HTTPException(status_code=403, detail="Only the account owner or an admin can reassign it")
    gc = (
        await db.execute(select(GeneralCompany).where(GeneralCompany.company_key == company_key))
    ).scalar_one_or_none()
    if not gc:
        raise HTTPException(status_code=404, detail="Company not found")
    gc.account_owner_id = data.owner_id
    gc.account_owner_email = data.owner_email
    await db.commit()
    return {"owner_id": data.owner_id, "owner_email": data.owner_email}


async def _stage_with_history(db: AsyncSession, stage_id: str, company_key: str):
    stage = (await db.execute(
        select(AccountWorkflowStage).where(AccountWorkflowStage.id == stage_id)
    )).scalar_one()
    history = (await db.execute(
        select(AccountStageHistory)
        .where(AccountStageHistory.stage_id == stage_id)
        .order_by(AccountStageHistory.created_at.desc())
    )).scalars().all()
    return AccountStageResponse(
        id=stage.id,
        company_key=stage.company_key,
        company_name=stage.company_name,
        name=stage.name,
        status=stage.status,
        objective=stage.objective,
        data=stage.data,
        order_index=stage.order_index,
        version=stage.version,
        history=[AccountStageSnapshot.model_validate(h) for h in history],
        created_at=stage.created_at,
        updated_at=stage.updated_at,
    )
