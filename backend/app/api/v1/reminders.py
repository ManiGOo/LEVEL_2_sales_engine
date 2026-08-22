from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.reminder import Reminder
from app.schemas.reminder import ReminderCreate, ReminderRead, ReminderUpdate, VISPRIVATE, VIS_SHARED

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _visible_to(user: User):
    """A reminder is visible to a user if they created it or it is shared."""
    return (Reminder.user_id == user.id) | (Reminder.visibility == VIS_SHARED)


@router.post("", response_model=ReminderRead)
async def create_reminder(
    payload: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    visibility = payload.visibility if payload.visibility in (VISPRIVATE, VIS_SHARED) else VISPRIVATE
    reminder = Reminder(
        user_id=user.id,
        user_email=user.email,
        account_key=payload.account_key,
        subject=payload.subject,
        due_at=payload.due_at,
        visibility=visibility,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get("", response_model=List[ReminderRead])
async def list_all_reminders(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Reminder).where(_visible_to(user)).order_by(Reminder.due_at.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{account_key}", response_model=List[ReminderRead])
async def list_account_reminders(
    account_key: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Reminder)
        .where(Reminder.account_key == account_key)
        .where(_visible_to(user))
        .order_by(Reminder.due_at.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{reminder_id}/complete", response_model=ReminderRead)
async def complete_reminder(
    reminder_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Reminder).where(Reminder.id == reminder_id)
    result = await db.execute(stmt)
    reminder = result.scalar_one_or_none()

    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if not (reminder.user_id == user.id or reminder.visibility == VIS_SHARED):
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_completed = True
    await db.commit()
    await db.refresh(reminder)
    return reminder
