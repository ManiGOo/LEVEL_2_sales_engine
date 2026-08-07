from typing import List, Optional
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel
from app.services import sentinel_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadResearchRequest(BaseModel):
    company_keys: List[str] = []


@router.post("/research")
async def research_leads(
    req: LeadResearchRequest = Body(...),
    user=Depends(get_current_user),
):
    return await sentinel_service.research_leads(req.company_keys)


@router.get("/status")
async def get_lead_status(user=Depends(get_current_user)):
    return await sentinel_service.get_lead_status()


@router.get("/{company_key}")
async def get_lead_detail(company_key: str, user=Depends(get_current_user)):
    return await sentinel_service.get_lead_detail(company_key)
