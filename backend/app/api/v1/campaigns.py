from fastapi import APIRouter, Depends
from app.services import sentinel_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/")
async def list_campaigns(user=Depends(get_current_user)):
    return await sentinel_service.get_campaigns()


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, user=Depends(get_current_user)):
    return await sentinel_service.get_campaign(campaign_id)


@router.post("/")
async def create_campaign(req: dict, user=Depends(get_current_user)):
    return await sentinel_service.create_campaign(req)


@router.post("/{campaign_id}/start")
async def start_campaign(campaign_id: str, user=Depends(get_current_user)):
    return await sentinel_service.start_campaign(campaign_id)
