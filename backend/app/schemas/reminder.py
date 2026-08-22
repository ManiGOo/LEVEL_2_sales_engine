from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import Optional

VISPRIVATE = "me"
VIS_SHARED = "all"


class ReminderBase(BaseModel):
    subject: str
    due_at: datetime
    is_completed: bool = False


class ReminderCreate(ReminderBase):
    account_key: Optional[str] = None
    visibility: str = VISPRIVATE  # "me" | "all"


class ReminderUpdate(BaseModel):
    subject: Optional[str] = None
    due_at: Optional[datetime] = None
    is_completed: Optional[bool] = None
    visibility: Optional[str] = None


class ReminderRead(ReminderBase):
    id: UUID
    user_id: str
    user_email: str
    account_key: Optional[str] = None
    visibility: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
