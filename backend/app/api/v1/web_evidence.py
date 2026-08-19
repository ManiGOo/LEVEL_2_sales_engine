from fastapi import APIRouter, Depends
from app.services import sentinel_service, web_evidence_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/web-evidence", tags=["web-evidence"])


@router.post("/search/{event_id}")
async def search_web_evidence(event_id: str, user=Depends(get_current_user)):
    """Start a web-evidence search (Temporal workflow run by the sales-app's own
    worker). Returns a workflow id to poll via GET /status/{workflow_id}."""
    return await web_evidence_service.search_web_evidence(event_id)


@router.get("/status/{workflow_id}")
async def web_evidence_status(workflow_id: str, user=Depends(get_current_user)):
    """Poll the status of a web-evidence search workflow."""
    return await web_evidence_service.get_web_evidence_status(workflow_id)


@router.get("/{event_id}")
async def get_web_evidence(event_id: str, user=Depends(get_current_user)):
    return await sentinel_service.get_web_evidence(event_id)
