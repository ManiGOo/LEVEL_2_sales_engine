from fastapi import APIRouter, Depends, Query
from app.services import sentinel_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/ranking")
async def get_company_ranking(
    page: int = Query(1),
    page_size: int = Query(10),
    q: str = Query(None),
    year: int = Query(None),
    state: str = Query(None),
    min_score: int = Query(None),
    max_score: int = Query(None),
    user=Depends(get_current_user),
):
    return await sentinel_service.get_companies(
        page=page, page_size=page_size, q=q,
        year=year, state=state, min_score=min_score, max_score=max_score,
    )


@router.get("/")
async def get_companies(
    page: int = Query(1),
    page_size: int = Query(10),
    q: str = Query(None),
    year: int = Query(None),
    state: str = Query(None),
    min_score: int = Query(None),
    max_score: int = Query(None),
    user=Depends(get_current_user),
):
    return await sentinel_service.get_companies(
        page=page, page_size=page_size, q=q,
        year=year, state=state, min_score=min_score, max_score=max_score,
    )


@router.get("/{slug}")
async def get_company(slug: str, user=Depends(get_current_user)):
    return await sentinel_service.get_company_detail(slug)


@router.get("/{slug}/signals")
async def get_company_signals(slug: str, user=Depends(get_current_user)):
    return await sentinel_service.get_company_detail(slug)
