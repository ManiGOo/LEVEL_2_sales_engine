from fastapi import APIRouter, Depends
from app.services import sentinel_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/web-evidence", tags=["web-evidence"])


@router.get("/{event_id}")
async def get_web_evidence(event_id: str, user=Depends(get_current_user)):
    return await sentinel_service.get_web_evidence(event_id)
