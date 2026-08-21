from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderRead, ReminderUpdate

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.post("", response_model=ReminderRead)
async def create_reminder(
    payload: ReminderCreate,
    db: AsyncSession = Depends(get_db)
):
    reminder = Reminder(**payload.model_dump())
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder

@router.get("", response_model=List[ReminderRead])
async def list_all_reminders(
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Reminder).order_by(Reminder.due_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{account_key}", response_model=List[ReminderRead])
async def list_account_reminders(
    account_key: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Reminder).where(Reminder.account_key == account_key).order_by(Reminder.due_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/{reminder_id}/complete", response_model=ReminderRead)
async def complete_reminder(
    reminder_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Reminder).where(Reminder.id == reminder_id)
    result = await db.execute(stmt)
    reminder = result.scalar_one_or_none()
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
        
    reminder.is_completed = True
    await db.commit()
    await db.refresh(reminder)
    return reminder
