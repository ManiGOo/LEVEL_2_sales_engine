import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | completed | archived
    objective: Mapped[str | None] = mapped_column(Text)
    target_audience: Mapped[str | None] = mapped_column(Text)
    offer_context: Mapped[str | None] = mapped_column(Text)
    sender_identity: Mapped[str | None] = mapped_column(String(255))
    approved_channels: Mapped[list] = mapped_column(JSON, default=list)
    daily_send_limit: Mapped[int] = mapped_column(Integer, default=20)
    stop_conditions: Mapped[str | None] = mapped_column(Text)
    preflight_complete: Mapped[bool] = mapped_column(default=False)

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
    messages: Mapped[list["OutreachMessage"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan", order_by="OutreachMessage.created_at.desc()"
    )


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_key: Mapped[str] = mapped_column(String(255), index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    phone: Mapped[str | None] = mapped_column(String(255))
    phone_label: Mapped[str | None] = mapped_column(String(50))  # Head Office | Mobile | Sales | Support | ...
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str | None] = mapped_column(String(100))
    source_url: Mapped[str | None] = mapped_column(String(1000))
    evidence: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[str | None] = mapped_column(String(20))
    verification_status: Mapped[str] = mapped_column(String(30), default="needs_review")
    outreach_readiness: Mapped[str] = mapped_column(String(40), default="needs_user_review")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    do_not_contact: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    campaign_leads: Mapped[list["CampaignLead"]] = relationship(back_populates="contact")


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
    contact_phone_label: Mapped[str | None] = mapped_column(String(50))  # Head Office | Mobile | Sales | Support | ...
    contact_source: Mapped[str | None] = mapped_column(String(100))
    contact_source_url: Mapped[str | None] = mapped_column(String(1000))
    contact_evidence: Mapped[str | None] = mapped_column(Text)
    contact_confidence: Mapped[str | None] = mapped_column(String(20))
    verification_status: Mapped[str] = mapped_column(String(30), default="needs_review")
    outreach_readiness: Mapped[str] = mapped_column(String(40), default="needs_user_review")
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    do_not_contact: Mapped[bool] = mapped_column(default=False)
    contact_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"), index=True)

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
    contact: Mapped["Contact | None"] = relationship(back_populates="campaign_leads")
    messages: Mapped[list["OutreachMessage"]] = relationship(back_populates="lead", cascade="all, delete-orphan")


class CampaignActivity(Base):
    __tablename__ = "campaign_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id: Mapped[str] = mapped_column(String(36), ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    lead_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("campaign_leads.id", ondelete="CASCADE"), index=True)
    actor_name: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(50))  # created | lead_added | lead_removed | status_change | note | contact | updated
    detail: Mapped[str | None] = mapped_column(Text)
    # Immutable event-store fields. A snapshot is written whenever a lifecycle
    # state changes so earlier stages can be inspected without relying on the
    # mutable campaign/lead rows.
    entity_type: Mapped[str | None] = mapped_column(String(20))  # campaign | lead | team_activity
    from_state: Mapped[str | None] = mapped_column(String(30))
    to_state: Mapped[str | None] = mapped_column(String(30))
    snapshot: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    lead: Mapped["CampaignLead | None"] = relationship(back_populates="activities")


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id: Mapped[str] = mapped_column(String(36), ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("campaign_leads.id", ondelete="CASCADE"), index=True)
    channel: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="draft")
    subject: Mapped[str | None] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text)
    generated_by: Mapped[str] = mapped_column(String(30), default="system")
    approved_by: Mapped[str | None] = mapped_column(String(255))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    campaign: Mapped["Campaign"] = relationship(back_populates="messages")
    lead: Mapped["CampaignLead"] = relationship(back_populates="messages")
