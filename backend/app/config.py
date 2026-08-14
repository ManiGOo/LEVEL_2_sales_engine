from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://sales:password@db:5432/sales_app"

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Groq
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # Sentinel
    sentinel_mcp_url: str = "http://sentinel:5000/mcp"
    sentinel_api_url: str = "http://sentinel:5000"

    # Cold Email Service (Level 3) — sole outbound email engine
    cold_email_url: str = "http://cold-email-service:8101"
    cold_email_api_key: str = "change-me-in-production"

    # ChromaDB
    chroma_host: str = "chromadb"
    chroma_port: int = 8000

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:80"]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
