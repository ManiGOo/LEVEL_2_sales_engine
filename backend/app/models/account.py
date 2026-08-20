import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AccountWorkflowStage(Base):
    """A single, user-editable stage in a company's sales-process workflow.

    Stages are unique per ``company_key`` and ordered by ``order_index``. Every
    time a stage is updated, the previous version is archived into
    :class:`AccountStageHistory` so the detail page can show the earlier
    snapshots (objective + reasons + captured data)."""

    __tablename__ = "account_workflow_stages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_key: Mapped[str] = mapped_column(String(255), index=True)
    company_name: Mapped[str] = mapped_column(String(255))

    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="planned")  # planned | active | completed | blocked
    objective: Mapped[str | None] = mapped_column(Text)  # the objective / reasons for this stage
    data: Mapped[dict | None] = mapped_column(JSON, default=dict)  # free-form snapshot captured at this stage
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)  # optimistic-concurrency counter

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AccountStageHistory(Base):
    """Immutable snapshot of an :class:`AccountWorkflowStage` before each edit."""

    __tablename__ = "account_stage_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stage_id: Mapped[str] = mapped_column(String(36), index=True)
    company_key: Mapped[str] = mapped_column(String(255), index=True)

    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30))
    objective: Mapped[str | None] = mapped_column(Text)
    data: Mapped[dict | None] = mapped_column(JSON)
    actor_name: Mapped[str | None] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
