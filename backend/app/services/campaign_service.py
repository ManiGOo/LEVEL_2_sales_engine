from datetime import datetime, timezone
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.campaign import Campaign, CampaignLead, CampaignActivity
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignLeadUpdate,
    CampaignLeadSeed,
    CampaignLeadResponse,
    CampaignResponse,
    CampaignSummary,
    CampaignPage,
    CampaignDetail,
    CampaignActivityResponse,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _actor(user: User | None) -> str | None:
    return (user.name if user else None) or None


async def _with_leads(db: AsyncSession, campaign_id: str) -> Campaign | None:
    result = await db.execute(
        select(Campaign)
        .where(Campaign.id == campaign_id)
        .options(selectinload(Campaign.leads))
    )
    return result.scalar_one_or_none()


async def _get_campaign(db: AsyncSession, campaign_id: str) -> Campaign | None:
    result = await db.execute(
        select(Campaign)
        .where(Campaign.id == campaign_id)
        .options(selectinload(Campaign.leads))
    )
    return result.scalar_one_or_none()


async def _log(
    db: AsyncSession,
    campaign_id: str,
    action: str,
    actor_name: str | None,
    detail: str | None = None,
    lead_id: str | None = None,
) -> None:
    db.add(
        CampaignActivity(
            campaign_id=campaign_id,
            lead_id=lead_id,
            action=action,
            actor_name=actor_name,
            detail=detail,
        )
    )


async def create_campaign(db: AsyncSession, data: CampaignCreate, user: User) -> Campaign:
    campaign = Campaign(
        name=data.name.strip(),
        description=(data.description or "").strip() or None,
        status="draft",
        created_by=user.id,
        created_by_name=_actor(user),
        objective=(data.objective or "").strip() or None,
        target_audience=(data.target_audience or "").strip() or None,
        offer_context=(data.offer_context or "").strip() or None,
        sender_identity=(data.sender_identity or "").strip() or None,
        approved_channels=data.approved_channels or [],
        daily_send_limit=max(1, data.daily_send_limit),
        stop_conditions=(data.stop_conditions or "").strip() or None,
    )
    db.add(campaign)
    await db.flush()

    for seed in data.leads:
        db.add(_to_lead(campaign.id, seed, user))
        await _log(db, campaign.id, "lead_added", _actor(user), detail=f"Added {seed.company_name or seed.company_key}", lead_id=None)

    await _log(db, campaign.id, "created", _actor(user), detail=f"Campaign '{campaign.name}' created")
    await db.commit()
    await db.refresh(campaign)
    return await _with_leads(db, campaign.id)


def _to_lead(campaign_id: str, seed: CampaignLeadSeed, user: User) -> CampaignLead:
    return CampaignLead(
        campaign_id=campaign_id,
        company_key=seed.company_key,
        company_name=seed.company_name or seed.company_key,
        website=(seed.website or "").strip() or None,
        linkedin_url=(seed.linkedin_url or "").strip() or None,
        contact_name=(seed.contact_name or "").strip() or None,
        contact_role=(seed.contact_role or "").strip() or None,
        contact_email=(seed.contact_email or "").strip() or None,
        contact_phone=(seed.contact_phone or "").strip() or None,
        contact_source=(seed.contact_source or "").strip() or None,
        contact_source_url=(seed.contact_source_url or "").strip() or None,
        contact_evidence=(seed.contact_evidence or "").strip() or None,
        contact_confidence=(seed.contact_confidence or "").strip() or None,
        verification_status=seed.verification_status,
        outreach_readiness=seed.outreach_readiness,
        verified_at=seed.verified_at,
        do_not_contact=seed.do_not_contact,
        status="queued",
        created_by_name=_actor(user),
    )


async def list_campaigns(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 30,
    q: str | None = None,
) -> CampaignPage:
    query = select(Campaign)
    count_query = select(func.count(Campaign.id))

    if q:
        pattern = f"%{q.strip()}%"
        cond = or_(
            Campaign.name.ilike(pattern),
            Campaign.description.ilike(pattern),
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total = (await db.execute(count_query)).scalar_one()
    pages = max((total + page_size - 1) // page_size, 1)
    page = max(min(page, pages), 1)

    result = await db.execute(
        query.order_by(Campaign.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(selectinload(Campaign.leads))
    )
    campaigns = result.scalars().all()

    summaries = []
    for c in campaigns:
        s = CampaignSummary.model_validate(c, from_attributes=True)
        s.lead_count = len(c.leads)
        summaries.append(s)

    return CampaignPage(items=summaries, total=total, page=page, page_size=page_size, pages=pages)


async def get_campaign_detail(db: AsyncSession, campaign_id: str) -> CampaignDetail | None:
    campaign = await _get_campaign(db, campaign_id)
    if not campaign:
        return None

    act_result = await db.execute(
        select(CampaignActivity)
        .where(CampaignActivity.campaign_id == campaign_id)
        .order_by(CampaignActivity.created_at.desc())
    )
    activities = act_result.scalars().all()

    response = CampaignResponse.model_validate(campaign, from_attributes=True)
    return CampaignDetail(campaign=response, activities=[CampaignActivityResponse.model_validate(a) for a in activities])


async def update_campaign(
    db: AsyncSession,
    campaign_id: str,
    data: CampaignUpdate,
    user: User,
) -> Campaign | None:
    campaign = await _get_campaign(db, campaign_id)
    if not campaign:
        return None

    changes = []
    if data.name is not None and data.name.strip() and data.name.strip() != campaign.name:
        campaign.name = data.name.strip()
        changes.append(f"Renamed to '{campaign.name}'")
    if data.description is not None:
        campaign.description = (data.description or "").strip() or None
        changes.append("Updated description")
    for field, label in (("objective", "objective"), ("target_audience", "target audience"),
                         ("offer_context", "offer context"), ("sender_identity", "sender identity"),
                         ("stop_conditions", "stop conditions")):
        value = getattr(data, field)
        if value is not None:
            setattr(campaign, field, (value or "").strip() or None)
            changes.append(f"Updated {label}")
    if data.approved_channels is not None:
        campaign.approved_channels = data.approved_channels
        changes.append("Updated approved channels")
    if data.daily_send_limit is not None:
        campaign.daily_send_limit = max(1, data.daily_send_limit)
        changes.append("Updated daily send limit")
    if any(label in changes for label in ("Updated objective", "Updated target audience", "Updated offer context", "Updated sender identity", "Updated approved channels", "Updated stop conditions")):
        campaign.preflight_complete = False
    if data.status is not None and data.status != campaign.status:
        if data.status == "active":
            missing = _preflight_missing(campaign)
            if missing:
                raise ValueError("Campaign cannot activate: " + ", ".join(missing))
            campaign.preflight_complete = True
        campaign.status = data.status
        changes.append(f"Status → {data.status}")

    campaign.updated_at = _now()
    if changes:
        await _log(db, campaign_id, "updated", _actor(user), detail="; ".join(changes))
    await db.commit()
    await db.refresh(campaign)
    return campaign


def _preflight_missing(campaign: Campaign) -> list[str]:
    missing = []
    for value, label in ((campaign.objective, "objective"), (campaign.target_audience, "target audience"),
                         (campaign.offer_context, "offer context"), (campaign.sender_identity, "sender identity"),
                         (campaign.stop_conditions, "stop conditions")):
        if not (value or "").strip():
            missing.append(label)
    if not campaign.approved_channels:
        missing.append("approved channel")
    if not campaign.leads:
        missing.append("at least one contact")
    blocked = [l.company_name for l in campaign.leads if l.do_not_contact or l.outreach_readiness in {"missing_contact_info", "needs_user_review", "blocked"}]
    if blocked:
        missing.append(f"contact readiness ({', '.join(blocked[:3])})")
    return missing


async def delete_campaign(db: AsyncSession, campaign_id: str, user: User) -> bool:
    campaign = await _get_campaign(db, campaign_id)
    if not campaign:
        return False
    await db.delete(campaign)
    await db.commit()
    return True


async def add_lead(db: AsyncSession, campaign_id: str, seed: CampaignLeadSeed, user: User) -> CampaignLead | None:
    campaign = await _get_campaign(db, campaign_id)
    if not campaign:
        return None
    lead = _to_lead(campaign_id, seed, user)
    db.add(lead)
    await db.flush()
    await _log(db, campaign_id, "lead_added", _actor(user), detail=f"Added {lead.company_name}", lead_id=lead.id)
    await db.commit()
    await db.refresh(lead)
    return lead


async def update_lead(
    db: AsyncSession,
    campaign_id: str,
    lead_id: str,
    data: CampaignLeadUpdate,
    user: User,
) -> CampaignLead | None:
    campaign = await _get_campaign(db, campaign_id)
    if not campaign:
        return None
    lead = next((l for l in campaign.leads if l.id == lead_id), None)
    if not lead:
        return None

    log_parts = []
    if data.contact_name is not None:
        lead.contact_name = (data.contact_name or "").strip() or None
    if data.contact_role is not None:
        lead.contact_role = (data.contact_role or "").strip() or None
    if data.contact_email is not None:
        lead.contact_email = (data.contact_email or "").strip() or None
    if data.contact_phone is not None:
        lead.contact_phone = (data.contact_phone or "").strip() or None
    if data.contact_source is not None:
        lead.contact_source = (data.contact_source or "").strip() or None
    if data.contact_source_url is not None:
        lead.contact_source_url = (data.contact_source_url or "").strip() or None
    if data.contact_evidence is not None:
        lead.contact_evidence = (data.contact_evidence or "").strip() or None
    if data.contact_confidence is not None:
        lead.contact_confidence = (data.contact_confidence or "").strip() or None
    if data.verification_status is not None:
        lead.verification_status = data.verification_status
    if data.outreach_readiness is not None:
        lead.outreach_readiness = data.outreach_readiness
    if data.verified_at is not None:
        lead.verified_at = data.verified_at
    if data.do_not_contact is not None:
        lead.do_not_contact = data.do_not_contact
    if data.status is not None and data.status != lead.status:
        log_parts.append(f"Status {lead.status} → {data.status}")
        lead.status = data.status
    if data.last_contact_at is not None:
        lead.last_contact_at = data.last_contact_at
        log_parts.append("Logged contact")
    if data.next_follow_up_at is not None:
        lead.next_follow_up_at = data.next_follow_up_at
    if data.notes is not None and (data.notes or "").strip() != (lead.notes or ""):
        if not log_parts:
            log_parts.append("Updated notes")
        lead.notes = (data.notes or "").strip() or None

    lead.updated_at = _now()
    if log_parts:
        actor = _actor(user)
        for part in log_parts:
            await _log(db, campaign_id, "status_change", actor, detail=part, lead_id=lead.id)
    await db.commit()
    await db.refresh(lead)
    return lead


async def remove_lead(db: AsyncSession, campaign_id: str, lead_id: str, user: User) -> bool:
    campaign = await _get_campaign(db, campaign_id)
    if not campaign:
        return False
    lead = next((l for l in campaign.leads if l.id == lead_id), None)
    if not lead:
        return False
    await db.delete(lead)
    await _log(db, campaign_id, "lead_removed", _actor(user), detail=f"Removed {lead.company_name}")
    await db.commit()
    return True


async def log_activity(
    db: AsyncSession,
    campaign_id: str,
    action: str,
    user: User,
    detail: str | None = None,
    lead_id: str | None = None,
) -> CampaignActivity | None:
    if lead_id:
        campaign = await _get_campaign(db, campaign_id)
        if not campaign:
            return None
        lead = next((l for l in campaign.leads if l.id == lead_id), None)
        if not lead:
            return None
        lead.updated_at = _now()
        if action == "contacted":
            lead.last_contact_at = _now()
    else:
        campaign = await _get_campaign(db, campaign_id)
        if not campaign:
            return None

    activity = CampaignActivity(
        campaign_id=campaign_id,
        lead_id=lead_id,
        action=action,
        actor_name=_actor(user),
        detail=(detail or "").strip() or None,
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity
