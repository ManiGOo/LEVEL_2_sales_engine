"""Lead research service backed by Temporal + the shared database.

Replaces the old network trigger to the scraper's API: the sales-app connects
to Temporal directly to start ``LeadResearchWorkflow`` (executed by the
scraper's worker), and reads/writes ``company_leads`` in the shared ``sdr_data``
schema itself.
"""
from datetime import datetime
from typing import Optional

from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func

from app.config import get_settings
from app.core.temporal import get_temporal_client
from app.scraper.db import SessionLocal
from app.scraper.models import RegulatoryEvent, CompanyLead, CompanyPhone
from app.scraper.scoring import _group_key
from app.scraper.names import clean_company_name, PAREN

settings = get_settings()

MAX_LEADS_PER_BATCH = 10


def _build_names() -> dict:
    """company_key -> display name, derived from the regulatory events."""
    names = {}
    mfr_col = func.coalesce(
        RegulatoryEvent.raw_details["manufacturer"].astext, "")
    db = SessionLocal()
    try:
        for (mfr,) in db.query(mfr_col).all():
            gkey = _group_key(mfr)
            if not gkey or gkey in names:
                continue
            names[gkey] = clean_company_name(PAREN.sub("", mfr)) or gkey
        return names
    finally:
        db.close()


def _upsert_lead(company_key: str, company_name: str) -> str:
    """Mark a lead as running and return its row status."""
    db = SessionLocal()
    try:
        row = db.query(CompanyLead).filter(CompanyLead.company_key == company_key).first()
        if row is None:
            row = CompanyLead(company_key=company_key)
            db.add(row)
        row.company_name = company_name
        row.status = "running"
        row.error = ""
        row.workflow_id = ""
        db.commit()
        return row.status
    finally:
        db.close()


def _set_workflow_id(company_key: str, workflow_id: str) -> None:
    db = SessionLocal()
    try:
        row = db.query(CompanyLead).filter(CompanyLead.company_key == company_key).first()
        if row is not None:
            row.workflow_id = workflow_id
            db.commit()
    finally:
        db.close()


def _mark_failed(company_key: str, error: str) -> None:
    db = SessionLocal()
    try:
        row = db.query(CompanyLead).filter(CompanyLead.company_key == company_key).first()
        if row is not None:
            row.status = "failed"
            row.error = error
            db.commit()
    finally:
        db.close()


def _list_leads() -> list:
    db = SessionLocal()
    try:
        rows = db.query(CompanyLead)\
            .order_by(CompanyLead.fetched_at.desc().nullslast(), CompanyLead.company_key)\
            .all()
        return [_lead_payload(r) for r in rows]
    finally:
        db.close()


def _get_lead(company_key: str):
    db = SessionLocal()
    try:
        return db.query(CompanyLead).filter(CompanyLead.company_key == company_key).first()
    finally:
        db.close()


def _lead_phones(company_key: str) -> list:
    db = SessionLocal()
    try:
        rows = db.query(CompanyPhone)\
            .filter(CompanyPhone.company_key == company_key)\
            .order_by(CompanyPhone.label, CompanyPhone.found_at)\
            .all()
        return [{
            "phone": p.phone,
            "label": p.label,
            "page_url": p.page_url,
            "context": p.context,
            "tel_href": p.tel_href,
            "found_at": str(p.found_at) if p.found_at else None,
        } for p in rows]
    finally:
        db.close()


def _lead_payload(r: CompanyLead) -> dict:
    registry = r.corporate_registry or {}
    registry_by_name = {
        (d.get("name") or "").strip().lower(): d
        for d in registry.get("directors", []) if d.get("name")
    }
    decision_makers = []
    for dm in (r.decision_makers or []):
        if not dm.get("source") and dm.get("name", "").strip().lower() in registry_by_name:
            rd = registry_by_name[dm["name"].strip().lower()]
            dm = {**dm, "source": "corporate_registry", "source_url": rd.get("source_url", "")}
        decision_makers.append(dm)
    return {
        "company_key": r.company_key,
        "company_name": r.company_name,
        "website": r.website,
        "linkedin_url": r.linkedin_url,
        "company_status": r.company_status or "unknown",
        "decision_makers": decision_makers,
        "intent_signals": r.intent_signals or [],
        "trigger_events": r.trigger_events or [],
        "activity_summary": r.activity_summary or "",
        "hiring": r.hiring or [],
        "hiring_news": r.hiring_news or [],
        "hiring_headline": (r.summary or {}).get("hiring_headline", ""),
        "summary": r.summary or {},
        "status": r.status,
        "error": r.error,
        "workflow_id": r.workflow_id,
        "fetched_at": str(r.fetched_at) if r.fetched_at else None,
        "phones_labeled": _lead_phones(r.company_key),
    }


async def research_leads(company_keys: list[str], companies: list[dict] | None = None) -> dict:
    """Start a LeadResearchWorkflow per company on the shared Temporal server."""
    keys = [k for k in (company_keys or []) if k]
    if not keys:
        return {"started": [], "count": 0}
    if len(keys) > MAX_LEADS_PER_BATCH:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=f"Select at most {MAX_LEADS_PER_BATCH} companies at a time.")

    names = await run_in_threadpool(_build_names)
    for c in (companies or []):
        if c.get("company_key") and c.get("company_name"):
            names.setdefault(c["company_key"], c["company_name"].strip())
    for k in keys:
        if k not in names:
            names[k] = clean_company_name(PAREN.sub("", k)) or k

    client = await get_temporal_client()
    started = []
    for key in keys:
        await run_in_threadpool(_upsert_lead, key, names[key])
        workflow_id = f"lead-research-{key[:16]}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        try:
            handle = await client.start_workflow(
                "LeadResearchWorkflow",
                args=[key, names[key]],
                id=workflow_id,
                task_queue=settings.temporal_task_queue,
            )
            await run_in_threadpool(_set_workflow_id, key, handle.id)
            row_status = "running"
        except Exception as e:  # noqa: BLE001
            await run_in_threadpool(_mark_failed, key, str(e))
            row_status = "failed"
            print(f"lead research start failed for {key}: {e}")
        started.append({"company_key": key, "status": row_status, "workflow_id": workflow_id})

    return {"started": started, "count": len(started)}


async def get_lead_status() -> dict:
    items = await run_in_threadpool(_list_leads)
    return {"items": items}


async def get_lead_detail(company_key: str) -> dict:
    row = await run_in_threadpool(_get_lead, company_key)
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Lead not found")
    return _lead_payload(row)
