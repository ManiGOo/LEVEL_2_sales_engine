from pydantic import BaseModel
from datetime import datetime


class CampaignLeadSeed(BaseModel):
    company_key: str
    company_name: str = ""
    website: str | None = None
    linkedin_url: str | None = None
    contact_name: str | None = None
    contact_role: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class CampaignCreate(BaseModel):
    name: str
    description: str | None = None
    leads: list[CampaignLeadSeed] = []


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class CampaignLeadUpdate(BaseModel):
    contact_name: str | None = None
    contact_role: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    status: str | None = None
    last_contact_at: datetime | None = None
    next_follow_up_at: datetime | None = None
    notes: str | None = None


class CampaignActivityCreate(BaseModel):
    action: str  # contacted | called | emailed | linkedin | note | other
    detail: str | None = None


class CampaignActivityResponse(BaseModel):
    id: str
    lead_id: str | None = None
    actor_name: str | None = None
    action: str
    detail: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CampaignLeadResponse(BaseModel):
    id: str
    company_key: str
    company_name: str
    website: str | None = None
    linkedin_url: str | None = None
    contact_name: str | None = None
    contact_role: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    status: str
    last_contact_at: datetime | None = None
    next_follow_up_at: datetime | None = None
    notes: str | None = None
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: str
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime
    lead_count: int = 0
    leads: list[CampaignLeadResponse] = []

    model_config = {"from_attributes": True}


class CampaignSummary(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: str
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime
    lead_count: int = 0

    model_config = {"from_attributes": True}


class CampaignPage(BaseModel):
    items: list[CampaignSummary]
    total: int
    page: int
    page_size: int
    pages: int


class CampaignDetail(BaseModel):
    campaign: CampaignResponse
    activities: list[CampaignActivityResponse]