from pydantic import BaseModel
from datetime import datetime


class DecisionMakerInput(BaseModel):
    name: str = ""
    role: str = ""
    role_type: str = ""
    email: str = ""
    linkedin_url: str = ""
    confidence: str = ""


class HiringInput(BaseModel):
    title: str = ""
    location: str = ""
    posted: str = ""
    url: str = ""


class HiringNewsInput(BaseModel):
    title: str = ""
    url: str = ""
    source: str = ""
    date: str = ""


class IntentSignalInput(BaseModel):
    category: str = ""
    title: str = ""
    url: str = ""
    snippet: str = ""


class GeneralCompanyCreate(BaseModel):
    name: str
    website: str | None = None
    linkedin_url: str | None = None
    company_status: str = "unknown"
    industry: str | None = None
    description: str | None = None
    location: str | None = None
    employees: str | None = None
    revenue: str | None = None
    email: str | None = None
    phone: str | None = None

    hiring_headline: str | None = None
    activity_summary: str | None = None
    notes: str | None = None

    decision_makers: list[DecisionMakerInput] = []
    hiring: list[HiringInput] = []
    hiring_news: list[HiringNewsInput] = []
    intent_signals: list[IntentSignalInput] = []
    trigger_events: list[IntentSignalInput] = []
    phones_labeled: list[dict] = []


class GeneralCompanyResponse(BaseModel):
    id: str
    company_key: str
    name: str
    website: str | None = None
    linkedin_url: str | None = None
    company_status: str
    industry: str | None = None
    description: str | None = None
    location: str | None = None
    employees: str | None = None
    revenue: str | None = None
    email: str | None = None
    phone: str | None = None
    hiring_headline: str | None = None
    activity_summary: str | None = None
    notes: str | None = None
    decision_makers: list[dict]
    hiring: list[dict]
    hiring_news: list[dict]
    intent_signals: list[dict]
    trigger_events: list[dict]
    phones_labeled: list[dict] = []
    created_by: str | None = None
    created_by_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GeneralCompanyPage(BaseModel):
    items: list[GeneralCompanyResponse]
    total: int
    page: int
    page_size: int
    pages: int