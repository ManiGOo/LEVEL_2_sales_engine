import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://pharmabkp:aivoadma25@216.48.184.249:5432/pharma"
engine = create_async_engine(DATABASE_URL, echo=True)

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE sales_app.general_companies ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';"))
    print("Done!")

asyncio.run(main())
