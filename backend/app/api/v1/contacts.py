from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc, or_, true
from app.dependencies import get_current_user
from app.scraper.db import SessionLocal
from app.scraper.models import CompanyLead

router = APIRouter(prefix="/contacts", tags=["contacts"])

class ContactResponse(BaseModel):
    name: str
    title: str
    source: str
    company_name: str
    company_key: str

class ContactsPageResponse(BaseModel):
    items: List[ContactResponse]
    page: int
    page_size: int
    total_count: int

@router.get("", response_model=ContactsPageResponse)
async def get_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    q: Optional[str] = None,
    user=Depends(get_current_user),
):
    db = SessionLocal()
    try:
        dm = func.jsonb_array_elements(CompanyLead.decision_makers).alias("dm")
        
        name_col = func.jsonb_extract_path_text(dm.column, "name")
        title_col = func.jsonb_extract_path_text(dm.column, "title")
        source_col = func.jsonb_extract_path_text(dm.column, "source")
        
        stmt = select(
            name_col.label("name"),
            title_col.label("title"),
            source_col.label("source"),
            CompanyLead.company_name,
            CompanyLead.company_key
        ).select_from(CompanyLead).join(dm, true())
        
        if q:
            search_term = f"%{q}%"
            stmt = stmt.where(
                or_(
                    name_col.ilike(search_term),
                    title_col.ilike(search_term),
                    CompanyLead.company_name.ilike(search_term)
                )
            )
            
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_count = db.execute(count_stmt).scalar() or 0
        
        stmt = stmt.order_by(CompanyLead.company_name, name_col)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        
        rows = db.execute(stmt).fetchall()
        
        items = []
        for row in rows:
            items.append(
                ContactResponse(
                    name=row.name or "",
                    title=row.title or "",
                    source=row.source or "unknown",
                    company_name=row.company_name or "",
                    company_key=row.company_key or ""
                )
            )
            
        return ContactsPageResponse(
            items=items,
            page=page,
            page_size=page_size,
            total_count=total_count
        )
    finally:
        db.close()
