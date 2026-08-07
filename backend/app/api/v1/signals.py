from fastapi import APIRouter, Depends, Query
from app.services import sentinel_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("/high-priority")
async def get_high_priority_signals(
    page: int = Query(1),
    page_size: int = Query(30),
    q: str = Query(None),
    year: int = Query(None),
    event_type: str = Query(None),
    group_by: str = Query(None),
    user=Depends(get_current_user),
):
    params = {"page": page, "page_size": page_size}
    if q:
        params["q"] = q
    if year:
        params["year"] = year
    if event_type:
        params["event_type"] = event_type
    if group_by:
        params["group_by"] = group_by
    return await sentinel_service.get_signals(**params)


@router.get("/{event_id}")
async def get_signal(event_id: str, user=Depends(get_current_user)):
    return await sentinel_service.get_web_evidence(event_id)
