from fastapi import APIRouter, Depends
from app.services import sentinel_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/web-evidence", tags=["web-evidence"])


@router.get("/{event_id}")
async def get_web_evidence(event_id: str, user=Depends(get_current_user)):
    return await sentinel_service.get_web_evidence(event_id)


@router.post("/search/{event_id}")
async def search_web_evidence(event_id: str, user=Depends(get_current_user)):
    return await sentinel_service.trigger_web_evidence_search(event_id)


@router.get("/status/{workflow_id}")
async def get_web_evidence_status(workflow_id: str, user=Depends(get_current_user)):
    return await sentinel_service.get_enrichment_status(workflow_id)
