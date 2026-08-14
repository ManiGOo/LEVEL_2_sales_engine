from fastapi import APIRouter, Depends, Query, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.config import get_settings
from app.models.campaign import OutreachMessage, CampaignLead, Campaign
from app.services import cold_email_service

settings = get_settings()

router = APIRouter(prefix="/cold-email", tags=["cold-email"])


@router.post("/handoff", response_model=dict)
async def handoff_approved_message(
    message_id: str = Query(..., description="OutreachMessage id (must be approved)"),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(select(OutreachMessage).where(OutreachMessage.id == message_id))
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if message.status != "approved":
        raise HTTPException(status_code=422, detail="Only human-approved messages can be handed off for sending")
    lead = None
    if message.lead_id:
        lead_res = await db.execute(select(CampaignLead).where(CampaignLead.id == message.lead_id))
        lead = lead_res.scalar_one_or_none()
    if lead and lead.do_not_contact:
        raise HTTPException(status_code=422, detail="Lead is do-not-contact")

    payload = {
        "message_id": message.id,
        "campaign_id": message.campaign_id,
        "lead_id": message.lead_id,
        "contact_email": lead.contact_email if lead else None,
        "subject": message.subject,
        "body": message.body,
        "sender_identities": "auto-rotate",
        "suppression_group_id": None,
        "metadata": {"handed_off_by": user.id if hasattr(user, "id") else None},
    }
    if not payload["contact_email"]:
        raise HTTPException(status_code=422, detail="No recipient email on the linked lead")
    try:
        outbound = await cold_email_service.handoff_message(payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Cold Email Service error: {exc}")
    return outbound


@router.get("/outbound", response_model=list[dict])
async def list_outbound(
    campaign_id: str | None = Query(None),
    user=Depends(get_current_user),
):
    try:
        return await cold_email_service.list_outbound(campaign_id=campaign_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Cold Email Service error: {exc}")


@router.get("/outbound/{outbound_id}", response_model=dict)
async def get_outbound(outbound_id: str, user=Depends(get_current_user)):
    try:
        return await cold_email_service.get_outbound_status(outbound_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Cold Email Service error: {exc}")


@router.post("/outbound/{outbound_id}/cancel", response_model=dict)
async def cancel_outbound(outbound_id: str, user=Depends(get_current_user)):
    try:
        return await cold_email_service.cancel_outbound(outbound_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Cold Email Service error: {exc}")


@router.get("/inbox", response_model=list[dict])
async def inbox(limit: int = Query(50, le=200), user=Depends(get_current_user)):
    try:
        return await cold_email_service.get_inbox(limit=limit)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Cold Email Service error: {exc}")


@router.get("/accounts/health", response_model=dict)
async def account_health(user=Depends(get_current_user)):
    try:
        return await cold_email_service.get_account_health()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Cold Email Service error: {exc}")


@router.post("/webhooks", status_code=200)
async def receive_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    """Receive status/reply events from the Cold Email Service."""
    if not settings.cold_email_api_key or x_api_key != settings.cold_email_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    applied = await cold_email_service.apply_webhook(db, payload)
    if not applied:
        # Unknown message id — still accept (idempotent).
        return {"status": "ignored"}
    return {"status": "applied"}
