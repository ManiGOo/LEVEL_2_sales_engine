from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.api.v1.router import router as v1_router
from contextlib import asynccontextmanager
from app.database import engine, Base, ensure_campaign_lead_schema, ensure_campaign_schema

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_campaign_lead_schema()
    await ensure_campaign_schema()
    yield
    await engine.dispose()


app = FastAPI(
    title="AIVOA Sentinel - Sales API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(v1_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
