from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class AccountStageSnapshot(BaseModel):
    id: str
    stage_id: str
    company_key: str
    name: str
    status: str
    objective: str | None = None
    data: dict | None = None
    actor_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountStageCreate(BaseModel):
    name: str
    status: str = "planned"  # planned | active | completed | blocked
    objective: str = ""
    data: dict[str, Any] = {}
    order_index: int | None = None  # when omitted, the stage is appended to the end


class AccountStageUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    objective: str | None = None
    data: dict[str, Any] | None = None
    order_index: int | None = None


class AccountStageResponse(BaseModel):
    id: str
    company_key: str
    company_name: str
    name: str
    status: str
    objective: str | None = None
    data: dict | None = None
    order_index: int
    version: int = 1
    history: list[AccountStageSnapshot] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccountDetail(BaseModel):
    company_key: str
    company_name: str | None = None
    owner_id: str | None = None
    owner_email: str | None = None
    stages: list[AccountStageResponse]


class AccountHistoryItem(BaseModel):
    id: str
    stage_id: str
    stage_name: str
    actor_name: str | None = None
    status: str
    created_at: datetime
    company_key: str | None = None

    model_config = {"from_attributes": True}


class AccountListItem(BaseModel):
    company_key: str
    name: str
    current_stage: AccountStageResponse | None = None
    total_stages: int = 0


class AccountListPage(BaseModel):
    items: list[AccountListItem]
    total: int
    page: int
    page_size: int
    pages: int


class AccountReorderRequest(BaseModel):
    ordered_ids: list[str]
