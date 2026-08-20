from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.signals import router as signals_router
from app.api.v1.companies import router as companies_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.web_evidence import router as web_evidence_router
from app.api.v1.leads import router as leads_router
from app.api.v1.reports import router as reports_router
from app.api.v1.campaigns import router as campaigns_router
from app.api.v1.general_companies import router as general_companies_router
from app.api.v1.accounts import router as accounts_router
from app.api.v1.quotations import router as quotations_router

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(chat_router)
router.include_router(signals_router)
router.include_router(companies_router)
router.include_router(conversations_router)
router.include_router(web_evidence_router)
router.include_router(leads_router)
router.include_router(reports_router)
router.include_router(campaigns_router)
router.include_router(general_companies_router)
router.include_router(accounts_router)
router.include_router(quotations_router)
