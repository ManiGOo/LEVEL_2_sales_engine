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
    contact_source: str | None = None
    contact_source_url: str | None = None
    contact_evidence: str | None = None
    contact_confidence: str | None = None
    verification_status: str = "needs_review"
    outreach_readiness: str = "needs_user_review"
    verified_at: datetime | None = None
    do_not_contact: bool = False


class CampaignCreate(BaseModel):
    name: str
    description: str | None = None
    leads: list[CampaignLeadSeed] = []
    objective: str | None = None
    target_audience: str | None = None
    offer_context: str | None = None
    sender_identity: str | None = None
    approved_channels: list[str] = []
    daily_send_limit: int = 20
    stop_conditions: str | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    objective: str | None = None
    target_audience: str | None = None
    offer_context: str | None = None
    sender_identity: str | None = None
    approved_channels: list[str] | None = None
    daily_send_limit: int | None = None
    stop_conditions: str | None = None


class CampaignLeadUpdate(BaseModel):
    contact_name: str | None = None
    contact_role: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    status: str | None = None
    last_contact_at: datetime | None = None
    next_follow_up_at: datetime | None = None
    notes: str | None = None
    contact_source: str | None = None
    contact_source_url: str | None = None
    contact_evidence: str | None = None
    contact_confidence: str | None = None
    verification_status: str | None = None
    outreach_readiness: str | None = None
    verified_at: datetime | None = None
    do_not_contact: bool | None = None


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
    contact_source: str | None = None
    contact_source_url: str | None = None
    contact_evidence: str | None = None
    contact_confidence: str | None = None
    verification_status: str
    outreach_readiness: str
    verified_at: datetime | None = None
    do_not_contact: bool
    contact_id: str | None = None
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
    objective: str | None = None
    target_audience: str | None = None
    offer_context: str | None = None
    sender_identity: str | None = None
    approved_channels: list[str] = []
    daily_send_limit: int = 20
    stop_conditions: str | None = None
    preflight_complete: bool = False
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
    preflight_complete: bool = False

    model_config = {"from_attributes": True}


class CampaignPage(BaseModel):
    items: list[CampaignSummary]
    total: int
    page: int
    page_size: int
    pages: int


class OutreachMessageResponse(BaseModel):
    id: str
    campaign_id: str
    lead_id: str
    channel: str
    status: str
    subject: str | None = None
    body: str
    generated_by: str
    approved_by: str | None = None
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignDetail(BaseModel):
    campaign: CampaignResponse
    activities: list[CampaignActivityResponse]
    messages: list[OutreachMessageResponse] = []
