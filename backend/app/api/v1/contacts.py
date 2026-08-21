from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
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
    email: Optional[str] = None
    linkedin_url: Optional[str] = None

class ContactsPageResponse(BaseModel):
    items: List[ContactResponse]
    page: int
    page_size: int
    total_count: int

class ContactUpdateRequest(BaseModel):
    old_name: str
    new_name: str
    new_title: str
    email: Optional[str] = None
    linkedin_url: Optional[str] = None

class ContactCreateRequest(BaseModel):
    company_name: str
    name: str
    title: str
    email: Optional[str] = None
    linkedin_url: Optional[str] = None

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
        title_col = func.jsonb_extract_path_text(dm.column, "role")
        source_col = func.jsonb_extract_path_text(dm.column, "source")
        email_col = func.jsonb_extract_path_text(dm.column, "email")
        linkedin_col = func.jsonb_extract_path_text(dm.column, "linkedin_url")
        
        stmt = select(
            name_col.label("name"),
            title_col.label("title"),
            source_col.label("source"),
            email_col.label("email"),
            linkedin_col.label("linkedin_url"),
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
                    company_key=row.company_key or "",
                    email=row.email or "",
                    linkedin_url=row.linkedin_url or ""
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

@router.put("/{company_key}")
async def update_contact(
    company_key: str,
    payload: ContactUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    db = SessionLocal()
    try:
        lead = db.query(CompanyLead).filter(CompanyLead.company_key == company_key).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Company not found")
            
        makers = lead.decision_makers or []
        updated = False
        for m in makers:
            if m.get("name") == payload.old_name:
                m["name"] = payload.new_name
                m["role"] = payload.new_title
                m["email"] = payload.email
                m["linkedin_url"] = payload.linkedin_url
                updated = True
                break
                
        if not updated:
            raise HTTPException(status_code=404, detail="Contact not found")
            
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(lead, "decision_makers")
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()


@router.post("/{company_key}")
async def create_contact(
    company_key: str,
    payload: ContactCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    db = SessionLocal()
    try:
        lead = db.query(CompanyLead).filter(CompanyLead.company_key == company_key).first()
        if not lead:
            # Create a new CompanyLead for manual accounts if it doesn't exist
            lead = CompanyLead(
                company_key=company_key,
                company_name=payload.company_name,
                decision_makers=[],
                source="manual"
            )
            db.add(lead)
            
        makers = list(lead.decision_makers or [])
        makers.append({
            "name": payload.name,
            "role": payload.title,
            "email": payload.email,
            "linkedin_url": payload.linkedin_url,
            "source": "manual"
        })
        
        lead.decision_makers = makers
        
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(lead, "decision_makers")
        db.commit()
        return {"status": "ok"}
    finally:
        db.close()
