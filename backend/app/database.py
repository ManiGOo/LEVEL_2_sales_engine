from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import inspect, text
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# All sales-app-owned tables live in the `sales_app` schema of the shared DB.
class Base(DeclarativeBase):
    pass


Base.metadata.schema = "sales_app"


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_sales_app_schema() -> None:
    """Create the sales_app schema (if missing) and ensure all owned tables
    exist. The scraper-owned `sdr_data` tables are managed by the scraper."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS sales_app"))
        await conn.run_sync(Base.metadata.create_all)


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
            existing = {c["name"] for c in inspect(sync_conn).get_columns("campaign_leads", schema="sales_app")}
            for name, definition in columns.items():
                if name not in existing:
                    sync_conn.execute(text(f"ALTER TABLE sales_app.campaign_leads ADD COLUMN {name} {definition}"))
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
            existing = {c["name"] for c in inspect(sync_conn).get_columns("campaigns", schema="sales_app")}
            for name, definition in columns.items():
                if name not in existing:
                    sync_conn.execute(text(f"ALTER TABLE sales_app.campaigns ADD COLUMN {name} {definition}"))
        await conn.run_sync(migrate)


async def ensure_campaign_activity_schema() -> None:
    columns = {
        "entity_type": "VARCHAR(20)",
        "from_state": "VARCHAR(30)",
        "to_state": "VARCHAR(30)",
        "snapshot": "JSON",
    }
    async with engine.begin() as conn:
        def migrate(sync_conn):
            existing = {c["name"] for c in inspect(sync_conn).get_columns("campaign_activities", schema="sales_app")}
            for name, definition in columns.items():
                if name not in existing:
                    sync_conn.execute(text(f"ALTER TABLE sales_app.campaign_activities ADD COLUMN {name} {definition}"))
        await conn.run_sync(migrate)


async def ensure_account_workflow_schema() -> None:
    """Additive, idempotent migrations for the account workflow tables."""
    stage_columns = {
        "version": "INTEGER NOT NULL DEFAULT 1",
    }
    company_columns = {
        "account_owner_id": "VARCHAR(36)",
        "account_owner_email": "VARCHAR(255)",
    }
    async with engine.begin() as conn:
        def migrate(sync_conn):
            stage_existing = {c["name"] for c in inspect(sync_conn).get_columns("account_workflow_stages", schema="sales_app")}
            for name, definition in stage_columns.items():
                if name not in stage_existing:
                    sync_conn.execute(text(f"ALTER TABLE sales_app.account_workflow_stages ADD COLUMN {name} {definition}"))
            company_existing = {c["name"] for c in inspect(sync_conn).get_columns("general_companies", schema="sales_app")}
            for name, definition in company_columns.items():
                if name not in company_existing:
                    sync_conn.execute(text(f"ALTER TABLE sales_app.general_companies ADD COLUMN {name} {definition}"))
        await conn.run_sync(migrate)


async def ensure_quotation_schema() -> None:
    """Additive, idempotent migrations for the quotations table."""
    columns = {
        "html": "TEXT",
    }
    async with engine.begin() as conn:
        def migrate(sync_conn):
            existing = {c["name"] for c in inspect(sync_conn).get_columns("quotations", schema="sales_app")}
            for name, definition in columns.items():
                if name not in existing:
                    sync_conn.execute(text(f"ALTER TABLE sales_app.quotations ADD COLUMN {name} {definition}"))
        await conn.run_sync(migrate)
