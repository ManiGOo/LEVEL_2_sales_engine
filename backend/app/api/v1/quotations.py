from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationUpdate,
    QuotationResponse,
    QuotationListPage,
    QuotationRender,
    QuotationDocumentSave,
    QuotationVersionMeta,
    QuotationVersionDetail,
)
from app.services import quotation_service
from app.services.account_service import can_edit

router = APIRouter(prefix="/quotations", tags=["quotations"])


def _assert_can_edit_quotation(user: User, owner_id: str | None) -> None:
    if not can_edit(user, owner_id):
        raise HTTPException(status_code=403, detail="You are not the owner of this quotation")


@router.get("", response_model=QuotationListPage)
async def list_quotations(
    page: int = Query(1),
    page_size: int = Query(30),
    company_key: str = Query(None),
    status: str = Query(None),
    q: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await quotation_service.list_quotations(
        db, page=page, page_size=page_size, company_key=company_key, status=status, q=q
    )


@router.post("", response_model=QuotationResponse, status_code=201)
async def create_quotation(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await quotation_service.create_quotation(db, data, user)


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    q = await quotation_service.get_quotation(db, quotation_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return q


@router.get("/{quotation_id}/render", response_model=QuotationRender)
async def render_quotation(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    q = await quotation_service.get_quotation(db, quotation_id)
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return QuotationRender(html=quotation_service.render_html(q))


@router.post("/{quotation_id}/render", response_model=QuotationRender)
async def render_quotation_from_form(
    quotation_id: str,
    body: QuotationUpdate | None = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    html = await quotation_service.render_preview(db, quotation_id, body)
    if html is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return QuotationRender(html=html)


@router.post("/{quotation_id}/document", response_model=QuotationResponse)
async def save_document(
    quotation_id: str,
    body: QuotationDocumentSave,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    _assert_can_edit_quotation(user, existing.owner_id)
    try:
        result = await quotation_service.save_document(
            db, quotation_id, body.html, expected_version=body.expected_version, actor=user
        )
    except quotation_service.ConcurrencyConflict:
        raise HTTPException(status_code=409, detail="Quotation was modified by someone else. Reload and retry.")
    if not result:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return result


@router.post("/{quotation_id}/document/reset", response_model=QuotationResponse)
async def reset_document(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    _assert_can_edit_quotation(user, existing.owner_id)
    result = await quotation_service.reset_document(db, quotation_id, actor=user)
    if not result:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return result


@router.get("/{quotation_id}/versions", response_model=list[QuotationVersionMeta])
async def list_quotation_versions(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return await quotation_service.list_versions(db, quotation_id)


@router.get("/{quotation_id}/versions/{version}", response_model=QuotationVersionDetail)
async def get_quotation_version(
    quotation_id: str,
    version: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    v = await quotation_service.get_version(db, quotation_id, version)
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    return QuotationVersionDetail(
        version=v.version,
        created_at=v.created_at,
        created_by_email=v.created_by_email,
        status=(v.data or {}).get("status", ""),
        total=float((v.data or {}).get("total", 0)),
        data=v.data,
        html=v.html,
    )


@router.post("/{quotation_id}/versions/{version}/restore", response_model=QuotationResponse)
async def restore_quotation_version(
    quotation_id: str,
    version: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    _assert_can_edit_quotation(user, existing.owner_id)
    try:
        result = await quotation_service.restore_version(db, quotation_id, version, actor=user)
    except quotation_service.ConcurrencyConflict:
        raise HTTPException(status_code=409, detail="Quotation was modified by someone else. Reload and retry.")
    if not result:
        raise HTTPException(status_code=404, detail="Version not found")
    return result


@router.patch("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: str,
    data: QuotationUpdate,
    expected_version: int = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    _assert_can_edit_quotation(user, existing.owner_id)
    try:
        result = await quotation_service.update_quotation(
            db, quotation_id, data, expected_version=expected_version, actor=user
        )
    except quotation_service.ConcurrencyConflict:
        raise HTTPException(status_code=409, detail="Quotation was modified by someone else. Reload and retry.")
    if not result:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return result


@router.post("/{quotation_id}/duplicate", response_model=QuotationResponse, status_code=201)
async def duplicate_quotation(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    _assert_can_edit_quotation(user, existing.owner_id)
    result = await quotation_service.duplicate_quotation(db, quotation_id, user)
    if not result:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return result


@router.delete("/{quotation_id}", status_code=204)
async def delete_quotation(
    quotation_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    existing = await quotation_service.get_quotation(db, quotation_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Quotation not found")
    _assert_can_edit_quotation(user, existing.owner_id)
    deleted = await quotation_service.delete_quotation(db, quotation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Quotation not found")
