from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import Optional

class ReminderBase(BaseModel):
    subject: str
    due_at: datetime
    is_completed: bool = False

class ReminderCreate(ReminderBase):
    account_key: str

class ReminderUpdate(BaseModel):
    subject: Optional[str] = None
    due_at: Optional[datetime] = None
    is_completed: Optional[bool] = None

class ReminderRead(ReminderBase):
    id: UUID
    account_key: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
