import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | completed | archived

    created_by: Mapped[str | None] = mapped_column(String(36))
    created_by_name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    leads: Mapped[list["CampaignLead"]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
        order_by="CampaignLead.created_at",
    )


class CampaignLead(Base):
    __tablename__ = "campaign_leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id: Mapped[str] = mapped_column(String(36), ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    company_key: Mapped[str] = mapped_column(String(255), index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(500))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))

    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_role: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(255))

    status: Mapped[str] = mapped_column(String(20), default="queued")  # queued | contacted | replied | not_interested | closed
    last_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)

    created_by_name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    campaign: Mapped["Campaign"] = relationship(back_populates="leads")
    activities: Mapped[list["CampaignActivity"]] = relationship(
        back_populates="lead",
        cascade="all, delete-orphan",
        order_by="CampaignActivity.created_at.desc()",
    )


class CampaignActivity(Base):
    __tablename__ = "campaign_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id: Mapped[str] = mapped_column(String(36), ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    lead_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("campaign_leads.id", ondelete="CASCADE"), index=True)
    actor_name: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(50))  # created | lead_added | lead_removed | status_change | note | contact | updated
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    lead: Mapped["CampaignLead | None"] = relationship(back_populates="activities")