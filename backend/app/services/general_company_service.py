import re
import uuid
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.general_company import GeneralCompany
from app.models.user import User
from app.schemas.general_company import GeneralCompanyCreate, GeneralCompanyUpdate, GeneralCompanyPage, GeneralCompanyResponse


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "company"


async def create_general_company(
    db: AsyncSession,
    data: GeneralCompanyCreate,
    user: User,
) -> GeneralCompany:
    base_key = _slugify(data.name)
    key = base_key
    existing = await get_general_company_by_key(db, key)
    while existing:
        key = f"{base_key}-{uuid.uuid4().hex[:6]}"
        existing = await get_general_company_by_key(db, key)

    company = GeneralCompany(
        company_key=key,
        name=data.name.strip(),
        website=(data.website or "").strip() or None,
        linkedin_url=(data.linkedin_url or "").strip() or None,
        company_status=data.company_status or "unknown",
        industry=(data.industry or "").strip() or None,
        description=(data.description or "").strip() or None,
        location=(data.location or "").strip() or None,
        employees=(data.employees or "").strip() or None,
        revenue=(data.revenue or "").strip() or None,
        email=(data.email or "").strip() or None,
        phone=(data.phone or "").strip() or None,
        hiring_headline=(data.hiring_headline or "").strip() or None,
        activity_summary=(data.activity_summary or "").strip() or None,
        notes=(data.notes or "").strip() or None,
        decision_makers=[dm.model_dump() for dm in data.decision_makers],
        hiring=[h.model_dump() for h in data.hiring],
        hiring_news=[n.model_dump() for n in data.hiring_news],
        intent_signals=[s.model_dump() for s in data.intent_signals],
        trigger_events=[s.model_dump() for s in data.trigger_events],
        created_by=user.id,
        created_by_name=user.name,
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


async def update_general_company(
    db: AsyncSession,
    company_key: str,
    data: GeneralCompanyUpdate,
) -> GeneralCompany | None:
    company = await get_general_company_by_key(db, company_key)
    if not company:
        return None
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("decision_makers", "hiring", "hiring_news", "intent_signals", "trigger_events"):
            setattr(company, field, [item.model_dump() for item in value] if value is not None else getattr(company, field))
        elif value is not None:
            setattr(company, field, value.strip() if isinstance(value, str) else value)
    
    await db.commit()
    await db.refresh(company)
    return company


async def get_general_company_by_key(db: AsyncSession, company_key: str) -> GeneralCompany | None:
    result = await db.execute(select(GeneralCompany).where(GeneralCompany.company_key == company_key))
    return result.scalar_one_or_none()


async def get_general_company_by_name(db: AsyncSession, name: str) -> GeneralCompany | None:
    pattern = name.strip().lower()
    result = await db.execute(select(GeneralCompany).where(func.lower(GeneralCompany.name) == pattern))
    return result.scalar_one_or_none()


async def list_general_companies(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 30,
    q: str | None = None,
) -> GeneralCompanyPage:
    query = select(GeneralCompany)
    count_query = select(func.count(GeneralCompany.id))

    if q:
        pattern = f"%{q.strip()}%"
        filter_expr = or_(
            GeneralCompany.name.ilike(pattern),
            GeneralCompany.industry.ilike(pattern),
            GeneralCompany.location.ilike(pattern),
        )
        query = query.where(filter_expr)
        count_query = count_query.where(filter_expr)

    total = (await db.execute(count_query)).scalar_one()
    pages = max((total + page_size - 1) // page_size, 1)
    page = max(min(page, pages), 1)

    result = await db.execute(
        query.order_by(GeneralCompany.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()

    return GeneralCompanyPage(
        items=[GeneralCompanyResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def delete_general_company(db: AsyncSession, company_key: str) -> bool:
    company = await get_general_company_by_key(db, company_key)
    if not company:
        return False
    await db.delete(company)
    await db.commit()
    return True