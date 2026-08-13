from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import inspect, text
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def ensure_campaign_lead_schema() -> None:
    """Apply additive campaign-lead columns for installations without Alembic.

    The app historically used ``create_all`` only, which does not alter an
    existing table. Keep this migration additive and idempotent so existing
    deployments can adopt contact provenance safely.
    """
    columns = {
        "contact_source": "VARCHAR(100)",
        "contact_source_url": "VARCHAR(1000)",
        "contact_evidence": "TEXT",
        "contact_confidence": "VARCHAR(20)",
        "verification_status": "VARCHAR(30) NOT NULL DEFAULT 'needs_review'",
        "outreach_readiness": "VARCHAR(40) NOT NULL DEFAULT 'needs_user_review'",
        "verified_at": "TIMESTAMP",
        "do_not_contact": "BOOLEAN NOT NULL DEFAULT FALSE",
        "contact_id": "VARCHAR(36)",
    }

    async with engine.begin() as conn:
        def migrate(sync_conn):
            existing = {c["name"] for c in inspect(sync_conn).get_columns("campaign_leads")}
            for name, definition in columns.items():
                if name not in existing:
                    sync_conn.execute(text(f"ALTER TABLE campaign_leads ADD COLUMN {name} {definition}"))
        await conn.run_sync(migrate)


async def ensure_campaign_schema() -> None:
    columns = {
        "objective": "TEXT",
        "target_audience": "TEXT",
        "offer_context": "TEXT",
        "sender_identity": "VARCHAR(255)",
        "approved_channels": "JSON",
        "daily_send_limit": "INTEGER NOT NULL DEFAULT 20",
        "stop_conditions": "TEXT",
        "preflight_complete": "BOOLEAN NOT NULL DEFAULT FALSE",
    }
    async with engine.begin() as conn:
        def migrate(sync_conn):
            existing = {c["name"] for c in inspect(sync_conn).get_columns("campaigns")}
            for name, definition in columns.items():
                if name not in existing:
                    sync_conn.execute(text(f"ALTER TABLE campaigns ADD COLUMN {name} {definition}"))
        await conn.run_sync(migrate)
