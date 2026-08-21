from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import AccountWorkflowStage, AccountStageHistory
from app.models.general_company import GeneralCompany
from app.models.user import User
from app.schemas.account import (
    AccountStageCreate,
    AccountStageUpdate,
    AccountStageResponse,
    AccountStageSnapshot,
    AccountDetail,
    AccountListItem,
    AccountListPage,
)


# Statuses a stage can be in. Kept here so service + API stay in sync.
STAGE_STATUSES = ["planned", "active", "completed", "blocked"]


class ConcurrencyConflict(Exception):
    """Raised when a stage was modified by someone else since it was loaded."""


def can_edit(user: User, owner_id: str | None) -> bool:
    """Owners and admins may edit an account; unowned accounts are claimable."""
    if user.role == "admin":
        return True
    if owner_id is None:
        return True
    return user.id == owner_id


async def get_owner(db: AsyncSession, company_key: str) -> tuple[str | None, str | None]:
    gc = (
        await db.execute(select(GeneralCompany).where(GeneralCompany.company_key == company_key))
    ).scalar_one_or_none()
    if not gc:
        return (None, None)
    return (gc.account_owner_id, gc.account_owner_email)


async def claim_owner_if_unset(db: AsyncSession, company_key: str, user: User) -> None:
    """First user to touch an account becomes its owner."""
    gc = (
        await db.execute(select(GeneralCompany).where(GeneralCompany.company_key == company_key))
    ).scalar_one_or_none()
    if gc and gc.account_owner_id is None:
        gc.account_owner_id = user.id
        gc.account_owner_email = user.email
        await db.commit()


def _current_stage(stages: list[AccountWorkflowStage]) -> AccountWorkflowStage | None:
    if not stages:
        return None
    active = [s for s in stages if s.status == "active"]
    if active:
        return min(active, key=lambda s: s.order_index)
    pending = [s for s in stages if s.status != "completed"]
    pool = pending if pending else stages
    return max(pool, key=lambda s: s.order_index)


def _to_stage_response(stage: AccountWorkflowStage, history: list[AccountStageHistory]) -> AccountStageResponse:
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


async def list_accounts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 30,
    q: str | None = None,
) -> AccountListPage:
    query = select(GeneralCompany)
    count_query = select(func.count(GeneralCompany.id))
    if q:
        pattern = f"%{q.strip()}%"
        filt = or_(
            GeneralCompany.name.ilike(pattern),
            GeneralCompany.industry.ilike(pattern),
            GeneralCompany.location.ilike(pattern),
        )
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = (await db.execute(count_query)).scalar_one()
    pages = max((total + page_size - 1) // page_size, 1)
    page = max(min(page, pages), 1)

    result = await db.execute(
        query.order_by(GeneralCompany.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    companies = result.scalars().all()

    items: list[AccountListItem] = []
    if companies:
        keys = [c.company_key for c in companies]
        stages_result = await db.execute(
            select(AccountWorkflowStage)
            .where(AccountWorkflowStage.company_key.in_(keys))
            .order_by(AccountWorkflowStage.order_index)
        )
        grouped: dict[str, list[AccountWorkflowStage]] = {}
        for s in stages_result.scalars().all():
            grouped.setdefault(s.company_key, []).append(s)

        name_by_key = {c.company_key: c.name for c in companies}
        for c in companies:
            stages = grouped.get(c.company_key, [])
            current = _current_stage(stages)
            items.append(
                AccountListItem(
                    company_key=c.company_key,
                    name=c.name,
                    current_stage=_to_stage_response(current, []) if current else None,
                    total_stages=len(stages),
                )
            )

    return AccountListPage(items=items, total=total, page=page, page_size=page_size, pages=pages)


async def get_account(db: AsyncSession, company_key: str) -> AccountDetail | None:
    company = await db.execute(
        select(GeneralCompany).where(GeneralCompany.company_key == company_key)
    )
    company = company.scalar_one_or_none()
    if not company:
        return None

    stages_result = await db.execute(
        select(AccountWorkflowStage)
        .where(AccountWorkflowStage.company_key == company_key)
        .order_by(AccountWorkflowStage.order_index)
    )
    stages = stages_result.scalars().all()

    responses: list[AccountStageResponse] = []
    for stage in stages:
        hist_result = await db.execute(
            select(AccountStageHistory)
            .where(AccountStageHistory.stage_id == stage.id)
            .order_by(AccountStageHistory.created_at.desc())
        )
        history = hist_result.scalars().all()
        responses.append(_to_stage_response(stage, list(history)))

    return AccountDetail(
        company_key=company_key,
        company_name=company.name,
        owner_id=company.account_owner_id,
        owner_email=company.account_owner_email,
        source=company.source,
        stages=responses,
    )


async def create_stage(
    db: AsyncSession,
    company_key: str,
    data: AccountStageCreate,
    actor_name: str | None,
) -> AccountWorkflowStage:
    company = await db.execute(
        select(GeneralCompany).where(GeneralCompany.company_key == company_key)
    )
    company = company.scalar_one_or_none()
    company_name = company.name if company else company_key

    order_index = data.order_index
    if order_index is None:
        max_result = await db.execute(
            select(func.max(AccountWorkflowStage.order_index)).where(
                AccountWorkflowStage.company_key == company_key
            )
        )
        order_index = (max_result.scalar() or -1) + 1

    stage = AccountWorkflowStage(
        company_key=company_key,
        company_name=company_name,
        name=data.name.strip(),
        status=data.status or "planned",
        objective=(data.objective or "").strip() or None,
        data=data.data or {},
        order_index=order_index,
    )
    db.add(stage)
    await db.commit()
    await db.refresh(stage)
    return stage


async def _snapshot_stage(db: AsyncSession, stage: AccountWorkflowStage, actor_name: str | None) -> None:
    snapshot = AccountStageHistory(
        stage_id=stage.id,
        company_key=stage.company_key,
        name=stage.name,
        status=stage.status,
        objective=stage.objective,
        data=stage.data,
        actor_name=actor_name,
    )
    db.add(snapshot)


async def update_stage(
    db: AsyncSession,
    company_key: str,
    stage_id: str,
    data: AccountStageUpdate,
    actor_name: str | None,
    expected_version: int | None = None,
) -> AccountWorkflowStage | None:
    result = await db.execute(
        select(AccountWorkflowStage).where(
            AccountWorkflowStage.id == stage_id,
            AccountWorkflowStage.company_key == company_key,
        )
    )
    stage = result.scalar_one_or_none()
    if not stage:
        return None

    # Optimistic concurrency: reject if someone else saved since this was loaded.
    if expected_version is not None and stage.version != expected_version:
        raise ConcurrencyConflict()

    # Archive the current version before mutating it.
    await _snapshot_stage(db, stage, actor_name)

    update = data.model_dump(exclude_unset=True)
    for field in ("name", "status", "objective", "data", "order_index"):
        if field in update and update[field] is not None:
            value = update[field]
            if field == "name":
                value = value.strip()
            elif field == "objective":
                value = value.strip() or None
            setattr(stage, field, value)

    stage.version = (stage.version or 0) + 1
    await db.commit()
    await db.refresh(stage)
    return stage


async def delete_stage(db: AsyncSession, company_key: str, stage_id: str) -> bool:
    result = await db.execute(
        select(AccountWorkflowStage).where(
            AccountWorkflowStage.id == stage_id,
            AccountWorkflowStage.company_key == company_key,
        )
    )
    stage = result.scalar_one_or_none()
    if not stage:
        return False
    await db.execute(
        select(AccountStageHistory).where(AccountStageHistory.stage_id == stage_id)
    )
    history = (await db.execute(
        select(AccountStageHistory).where(AccountStageHistory.stage_id == stage_id)
    )).scalars().all()
    for h in history:
        await db.delete(h)
    await db.delete(stage)
    await db.commit()
    return True


async def reorder_stages(db: AsyncSession, company_key: str, ordered_ids: list[str]) -> bool:
    stages_result = await db.execute(
        select(AccountWorkflowStage).where(
            AccountWorkflowStage.company_key == company_key,
            AccountWorkflowStage.id.in_(ordered_ids),
        )
    )
    stages = {s.id: s for s in stages_result.scalars().all()}
    if not stages:
        return False
    for index, stage_id in enumerate(ordered_ids):
        if stage_id in stages:
            stages[stage_id].order_index = index
    await db.commit()
    return True


async def get_history(db: AsyncSession, company_key: str) -> list[AccountStageHistory]:
    """All stage snapshots for an account, newest first — used by the audit timeline."""
    result = await db.execute(
        select(AccountStageHistory)
        .join(AccountWorkflowStage, AccountStageHistory.stage_id == AccountWorkflowStage.id)
        .where(AccountWorkflowStage.company_key == company_key)
        .order_by(AccountStageHistory.created_at.desc())
    )
    return list(result.scalars().all())

async def get_global_history(db: AsyncSession, limit: int = 5) -> list[AccountStageHistory]:
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(AccountStageHistory)
        .options(selectinload(AccountStageHistory.stage))
        .order_by(AccountStageHistory.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
