import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class GeneralCompany(Base):
    __tablename__ = "general_companies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)

    website: Mapped[str | None] = mapped_column(String(500))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    company_status: Mapped[str] = mapped_column(String(50), default="unknown")
    industry: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(255))
    employees: Mapped[str | None] = mapped_column(String(100))
    revenue: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(100))

    hiring_headline: Mapped[str | None] = mapped_column(String(500))
    activity_summary: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    decision_makers: Mapped[list] = mapped_column(JSON, default=list)
    hiring: Mapped[list] = mapped_column(JSON, default=list)
    hiring_news: Mapped[list] = mapped_column(JSON, default=list)
    intent_signals: Mapped[list] = mapped_column(JSON, default=list)
    trigger_events: Mapped[list] = mapped_column(JSON, default=list)
    phones_labeled: Mapped[list] = mapped_column(JSON, default=list)  # [{phone, label, page_url, context, tel_href}]

    created_by: Mapped[str | None] = mapped_column(String(36))
    created_by_name: Mapped[str | None] = mapped_column(String(255))

    # Account workflow ownership. The first user to build the workflow claims the
    # account; only the owner (or an admin) may edit it afterwards.
    account_owner_id: Mapped[str | None] = mapped_column(String(36), index=True)
    account_owner_email: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )