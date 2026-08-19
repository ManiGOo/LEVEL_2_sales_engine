from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database — single shared Postgres instance. The already-scraped data lives
    # in the `sdr_data` schema (written by the scraper); the sales-app's own
    # tables live in the `sales_app` schema. Both share this one database.
    database_url: str  # required — provided via DATABASE_URL in backend/.env

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Groq
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # Temporal — the sales-app runs its own lead-research worker on this queue.
    temporal_host: str = "localhost:7233"
    temporal_task_queue: str = "sales-lead-task-queue"

    # ChromaDB
    chroma_host: str = "chromadb"
    chroma_port: int = 8000

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:80"]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
