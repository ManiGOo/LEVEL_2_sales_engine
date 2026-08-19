"""Sync DB access to the shared Pharma Postgres database.

The sales-app connects directly to the same database the scraper writes to
(schema ``sdr_data``). Reads of the already-scraped data use a synchronous
SQLAlchemy session (the scraper's query/scoring logic is written against a sync
``Session``); the sales-app's own writes use the async engine in
``app.database``.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings

settings = get_settings()


def _sync_url(url: str) -> str:
    """Convert an asyncpg URL to a sync psycopg2 URL."""
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + url[len("postgresql+asyncpg://"):]
    return url


SYNC_DATABASE_URL = _sync_url(settings.database_url)

engine = create_engine(SYNC_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
