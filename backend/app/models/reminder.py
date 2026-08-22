from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from app.database import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(36), index=True, nullable=False, default="")
    user_email = Column(String(255), nullable=False, default="")
    account_key = Column(String, index=True, nullable=True)
    subject = Column(String, nullable=False)
    due_at = Column(DateTime(timezone=True), nullable=False)
    # "me"  -> visible only to the creator
    # "all" -> visible to every user (support-wide)
    visibility = Column(String(16), nullable=False, default="me")
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
