import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, DateTime, Text, JSON, Integer, Numeric, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Quotation(Base):
    """A commercial quotation (proposal) for an account / company.

    Line items are stored as JSON for flexibility (one-time vs recurring charges,
    discounts, categories). Monetary totals are computed by the service on every
    write so the list view can show them without recomputing."""

    __tablename__ = "quotations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_key: Mapped[str] = mapped_column(String(255), index=True)
    company_name: Mapped[str] = mapped_column(String(255))

    quote_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|sent|accepted|rejected|expired
    currency: Mapped[str] = mapped_column(String(8), default="USD")

    title: Mapped[str] = mapped_column(String(255), default="Commercial Proposal")
    quotation_date: Mapped[date | None] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)

    intro: Mapped[str | None] = mapped_column(Text)  # executive overview
    terms: Mapped[str | None] = mapped_column(Text)  # payment terms & conditions
    scope: Mapped[str | None] = mapped_column(Text)  # functional scope & architecture
    modules: Mapped[list] = mapped_column(JSON, default=list)  # structured functional scope modules
    notes: Mapped[str | None] = mapped_column(Text)

    buyer_signatory_name: Mapped[str | None] = mapped_column(String(255))
    buyer_signatory_title: Mapped[str | None] = mapped_column(String(255))
    buyer_signatory_date: Mapped[str | None] = mapped_column(String(64))
    seller_signatory_name: Mapped[str | None] = mapped_column(String(255))
    seller_signatory_title: Mapped[str | None] = mapped_column(String(255))
    seller_signatory_date: Mapped[str | None] = mapped_column(String(64))

    line_items: Mapped[list] = mapped_column(JSON, default=list)

    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    discount_total: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    tax_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    owner_id: Mapped[str | None] = mapped_column(String(36), index=True)
    owner_email: Mapped[str | None] = mapped_column(String(255))

    version: Mapped[int] = mapped_column(Integer, default=1)
    html: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
