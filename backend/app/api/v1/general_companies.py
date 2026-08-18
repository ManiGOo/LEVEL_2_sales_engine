from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.general_company import GeneralCompanyCreate, GeneralCompanyUpdate, GeneralCompanyResponse, GeneralCompanyPage
from app.services import general_company_service

router = APIRouter(prefix="/general-companies", tags=["general-companies"])


@router.post("", response_model=GeneralCompanyResponse)
async def create_general_company(
    data: GeneralCompanyCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    company = await general_company_service.create_general_company(db, data, user)
    return company


@router.patch("/{company_key}", response_model=GeneralCompanyResponse)
async def update_general_company(
    company_key: str,
    data: GeneralCompanyUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    company = await general_company_service.update_general_company(db, company_key, data)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("", response_model=GeneralCompanyPage)
async def list_general_companies(
    page: int = Query(1),
    page_size: int = Query(30),
    q: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await general_company_service.list_general_companies(db, page=page, page_size=page_size, q=q)


@router.get("/{company_key}", response_model=GeneralCompanyResponse)
async def get_general_company(
    company_key: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    company = await general_company_service.get_general_company_by_key(db, company_key)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.delete("/{company_key}")
async def delete_general_company(
    company_key: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    deleted = await general_company_service.delete_general_company(db, company_key)
    if not deleted:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"status": "deleted"}