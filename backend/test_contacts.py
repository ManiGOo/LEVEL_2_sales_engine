import asyncio
from sqlalchemy import select, func
from sqlalchemy.orm import aliased
from app.scraper.db import SessionLocal
from app.scraper.models import CompanyLead

async def main():
    db = SessionLocal()
    try:
        # We can use func.jsonb_array_elements
        # In SQLAlchemy 2.0:
        dm = func.jsonb_array_elements(CompanyLead.decision_makers).alias("dm")
        stmt = select(
            CompanyLead.company_key,
            CompanyLead.company_name,
            func.jsonb_extract_path_text(dm.column, 'name').label('name'),
            func.jsonb_extract_path_text(dm.column, 'title').label('title')
        ).select_from(CompanyLead).join(dm, True).limit(5)
        
        results = db.execute(stmt).fetchall()
        for r in results:
            print(r)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
