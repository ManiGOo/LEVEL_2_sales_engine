import httpx
from app.config import get_settings

settings = get_settings()


def _headers() -> dict:
    return {"X-API-Key": settings.cold_email_api_key}


async def handoff_message(payload: dict) -> dict:
    """Hand an approved outreach message to the Cold Email Service for sending."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{settings.cold_email_url}/api/v1/outbound",
            json=payload,
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_outbound_status(outbound_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.cold_email_url}/api/v1/outbound/{outbound_id}",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def list_outbound(campaign_id: str | None = None) -> dict:
    params = {"campaign_id": campaign_id} if campaign_id else None
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.cold_email_url}/api/v1/outbound",
            params=params,
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def cancel_outbound(outbound_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{settings.cold_email_url}/api/v1/outbound/{outbound_id}/cancel",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_inbox(limit: int = 50) -> list:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.cold_email_url}/api/v1/inbox",
            params={"limit": limit},
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


async def get_account_health() -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.cold_email_url}/api/v1/domains/accounts/health",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()


# Events pushed by the Cold Email Service -> sales-app OutreachMessage status.
_WEBHOOK_TO_MESSAGE_STATUS = {
    "message_sent": "sent",
    "message_delivered": "delivered",
    "message_bounced": "bounced",
    "message_failed": "failed",
    "reply_received": "replied",
    "unsubscribe": "failed",
    "spam_report": "failed",
}

# Events that auto-stop a lead's outreach.
_STOP_LEAD_EVENTS = {"reply_received", "unsubscribe", "spam_report", "message_bounced"}


async def apply_webhook(db, payload: dict) -> bool:
    """Apply a Cold Email Service webhook to the local campaign/lead state."""
    from sqlalchemy import select
    from app.models.campaign import OutreachMessage, CampaignLead

    message_id = payload.get("message_id")
    if not message_id:
        return False
    result = await db.execute(select(OutreachMessage).where(OutreachMessage.id == message_id))
    message = result.scalar_one_or_none()
    if not message:
        return False

    event = payload.get("event")
    new_status = _WEBHOOK_TO_MESSAGE_STATUS.get(event)
    if new_status:
        message.status = new_status

    lead = None
    if message.lead_id:
        lead_res = await db.execute(select(CampaignLead).where(CampaignLead.id == message.lead_id))
        lead = lead_res.scalar_one_or_none()

    if event == "message_sent" and lead and lead.status == "queued":
        lead.status = "contacted"
    elif event == "reply_received" and lead:
        lead.status = "replied"
    elif event in _STOP_LEAD_EVENTS and lead:
        lead.do_not_contact = True
        if lead.status in {"queued", "contacted"}:
            lead.status = "closed"

    await db.commit()
    return True
