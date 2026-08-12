from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignLeadUpdate,
    CampaignLeadSeed,
    CampaignLeadResponse,
    CampaignResponse,
    CampaignPage,
    CampaignDetail,
    CampaignActivityCreate,
    CampaignActivityResponse,
)
from app.services import campaign_service

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.post("", response_model=CampaignResponse)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if not data.name.strip():
        raise HTTPException(status_code=422, detail="Campaign name is required")
    campaign = await campaign_service.create_campaign(db, data, user)
    return campaign


@router.get("", response_model=CampaignPage)
async def list_campaigns(
    page: int = Query(1),
    page_size: int = Query(30),
    q: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await campaign_service.list_campaigns(db, page=page, page_size=page_size, q=q)


@router.get("/{campaign_id}", response_model=CampaignDetail)
async def get_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    detail = await campaign_service.get_campaign_detail(db, campaign_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return detail


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    campaign = await campaign_service.update_campaign(db, campaign_id, data, user)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    deleted = await campaign_service.delete_campaign(db, campaign_id, user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "deleted"}


@router.post("/{campaign_id}/leads", response_model=CampaignLeadResponse)
async def add_lead(
    campaign_id: str,
    seed: CampaignLeadSeed,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    lead = await campaign_service.add_lead(db, campaign_id, seed, user)
    if not lead:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return lead


@router.patch("/{campaign_id}/leads/{lead_id}", response_model=CampaignLeadResponse)
async def update_lead(
    campaign_id: str,
    lead_id: str,
    data: CampaignLeadUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    lead = await campaign_service.update_lead(db, campaign_id, lead_id, data, user)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.delete("/{campaign_id}/leads/{lead_id}")
async def remove_lead(
    campaign_id: str,
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    removed = await campaign_service.remove_lead(db, campaign_id, lead_id, user)
    if not removed:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"status": "removed"}


@router.post("/{campaign_id}/leads/{lead_id}/activities", response_model=CampaignActivityResponse)
async def log_activity(
    campaign_id: str,
    lead_id: str,
    data: CampaignActivityCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    activity = await campaign_service.log_activity(
        db, campaign_id, action=data.action, detail=data.detail, lead_id=lead_id, user=user
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Campaign or lead not found")
    return activity