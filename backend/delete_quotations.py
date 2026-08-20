import asyncio
from app.database import async_session
from app.models.quotation import Quotation
from app.models.quotation_version import QuotationVersion
from sqlalchemy import select, delete

async def main():
    async with async_session() as session:
        quote_numbers = ['Q-2026-0004', 'Q-2026-0005', 'Q-2026-0003', 'Q-2026-0001']
        
        # Get IDs of quotations to delete
        result = await session.execute(select(Quotation.id).where(Quotation.quote_number.in_(quote_numbers)))
        q_ids = [row[0] for row in result.all()]
        
        if not q_ids:
            print("No matching quotations found.")
            return

        print(f"Deleting quotations with IDs: {q_ids}")
        
        # Delete related versions first
        await session.execute(delete(QuotationVersion).where(QuotationVersion.quotation_id.in_(q_ids)))
        
        # Delete quotations
        await session.execute(delete(Quotation).where(Quotation.id.in_(q_ids)))
        
        await session.commit()
        print(f"Successfully deleted {len(q_ids)} quotations and their versions.")

if __name__ == "__main__":
    asyncio.run(main())
