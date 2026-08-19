"""Read-only query functions over the already-scraped ``sdr_data`` tables.

These mirror the read tools the scraper exposed over MCP, so the sales-app can
serve the exact same JSON payloads directly from the shared database instead of
calling the scraper over the network. Each function opens its own sync session.
"""
from typing import Optional

from sqlalchemy import extract, func, or_

from app.scraper.db import SessionLocal
from app.scraper.models import (
    RegulatoryEvent, RegulatoryEvidence, EnrichmentCheck, WebEvidence,
    CompanyLead, CompanyPhone,
)
from app.scraper.helpers import MANDATE_START, recency_weight, repeat_offender_bonus, mfr_key
from app.scraper.names import clean_company_name, PAREN
from app.scraper.paper import assess_paper_category
from app.scraper import scoring as _scoring


# Re-export the grouping/scoring helpers the lead tools rely on.
_group_key = _scoring._group_key
_slug = _scoring._slug
_prior_event_counts = _scoring._prior_event_counts
_is_paper_event = _scoring._is_paper_event
_load_enrichment = _scoring._load_enrichment
_load_web_evidence = _scoring._load_web_evidence
_web_evidence_bonus = _scoring._web_evidence_bonus
company_key = _scoring.company_key
_build_signal_card = _scoring._build_signal_card


def query_signals(
    min_score: int = 0,
    year: Optional[int] = None,
    page: int = 1,
    page_size: int = 30,
    q: Optional[str] = None,
    event_type: Optional[str] = None,
    is_paper: Optional[bool] = None,
    paper_class: Optional[str] = None,
    group_by: Optional[str] = None,
    rule_96: bool = False,
    sub_rule_7: bool = False,
    schedule_h2: bool = False,
    schedule_m_gap: Optional[str] = None,
) -> dict:
    """Paginated regulatory signals with filtering. Use group_by='company' to
    collapse repeated incidents per company."""
    db = SessionLocal()
    try:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 200)

        query = db.query(RegulatoryEvent)
        if year:
            query = query.filter(extract('year', RegulatoryEvent.event_date) == year)
        if min_score:
            query = query.filter(RegulatoryEvent.score >= min_score)
        if event_type:
            query = query.filter(RegulatoryEvent.event_type == event_type)
        if is_paper is not None:
            query = query.filter(RegulatoryEvent.llm_analysis['is_paper_failure'].astext == str(is_paper).lower())
        if paper_class in ("explicit", "deductive", "none"):
            query = query.filter(RegulatoryEvent.paper_evidence_class == paper_class)
        if rule_96:
            query = query.filter(RegulatoryEvent.llm_analysis['violates_rule_96'].astext == 'true')
        if sub_rule_7:
            query = query.filter(RegulatoryEvent.llm_analysis['violates_sub_rule_7'].astext == 'true')
        if schedule_h2:
            query = query.filter(RegulatoryEvent.llm_analysis['violates_schedule_h2'].astext == 'true')
        if schedule_m_gap:
            query = query.filter(RegulatoryEvent.llm_analysis['schedule_m_gap'].astext == schedule_m_gap)
        if q:
            like = f"%{q.strip().lower()}%"
            query = query.filter(or_(
                func.lower(func.coalesce(RegulatoryEvent.raw_details['drug_name'].astext, '')).like(like),
                func.lower(func.coalesce(RegulatoryEvent.raw_details['manufacturer'].astext, '')).like(like),
                func.lower(func.coalesce(RegulatoryEvent.raw_details['batch_no'].astext, '')).like(like),
                func.lower(func.coalesce(RegulatoryEvent.raw_details['reason'].astext, '')).like(like),
                func.lower(RegulatoryEvent.event_type).like(like),
            ))

        total = query.count()
        mfr_col = func.coalesce(RegulatoryEvent.raw_details['manufacturer'].astext, '')
        counts = {}
        for mfr, cnt in db.query(mfr_col, func.count(RegulatoryEvent.event_id))\
                .group_by(mfr_col).all():
            key = mfr_key(mfr)
            if key:
                counts[key] = counts.get(key, 0) + cnt

        web_by_key = _load_web_evidence(db)

        if group_by == "company":
            matching = query.order_by(RegulatoryEvent.score.desc()).all()
            groups = []
            group_of = {}
            for event in matching:
                mfr = (event.raw_details or {}).get('manufacturer', '')
                key = _group_key(mfr) if mfr_key(mfr) else f"__evt__{event.event_id}"
                if key not in group_of:
                    group_of[key] = len(groups)
                    groups.append({"events": [event]})
                else:
                    groups[group_of[key]]["events"].append(event)

            total = len(groups)
            page_groups = groups[(page - 1) * page_size: page * page_size]

            page_keys = set()
            for g in page_groups:
                ckey = company_key((g["events"][0].raw_details or {}).get('manufacturer', ''))
                if ckey:
                    page_keys.add(ckey)
            checks_by_key, evidence_by_key = _load_enrichment(db, page_keys)

            response = []
            for g in page_groups:
                g["events"].sort(key=lambda e: e.score, reverse=True)
                cards = [_build_signal_card(e, counts, checks_by_key, evidence_by_key, web_by_key, db)
                         for e in g["events"]]
                card = cards[0]
                if len(cards) > 1:
                    card["event_count"] = len(cards)
                    card["events"] = cards[1:]
                response.append(card)
        else:
            events = query.order_by(RegulatoryEvent.score.desc())\
                        .offset((page - 1) * page_size)\
                        .limit(page_size)\
                        .all()

            page_keys = set()
            for event in events:
                ckey = company_key((event.raw_details or {}).get('manufacturer', ''))
                if ckey:
                    page_keys.add(ckey)
            checks_by_key, evidence_by_key = _load_enrichment(db, page_keys)

            response = [_build_signal_card(e, counts, checks_by_key, evidence_by_key, web_by_key, db)
                        for e in events]

        db.commit()
        return {
            "items": response,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }
    finally:
        db.close()


def get_company_count() -> dict:
    """Count of unique company entities."""
    db = SessionLocal()
    try:
        keys = set()
        mfr_col = func.coalesce(RegulatoryEvent.raw_details['manufacturer'].astext, '')
        for (mfr,) in db.query(mfr_col).all():
            gkey = _group_key(mfr)
            if gkey:
                keys.add(gkey)
        return {"total": len(keys)}
    finally:
        db.close()


def get_company_ranking(page: int = 1, page_size: int = 10, q: Optional[str] = None) -> dict:
    """Company leaderboard ranked by highest-scoring signal."""
    db = SessionLocal()
    try:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        q = (q or "").strip().lower()

        events = db.query(RegulatoryEvent).order_by(RegulatoryEvent.score.desc()).all()
        counts = _prior_event_counts(db)
        groups = {}
        for e in events:
            mfr = (e.raw_details or {}).get("manufacturer", "")
            gkey = _group_key(mfr)
            if not gkey:
                continue
            if q:
                hay = " ".join(
                    str((e.raw_details or {}).get(k, "")) for k in
                    ("manufacturer", "drug_name", "reason", "batch_no")
                ).lower()
                if q not in hay:
                    continue
            g = groups.get(gkey)
            if g is None:
                g = {
                    "gkey": gkey,
                    "name": clean_company_name(PAREN.sub("", mfr)) or gkey,
                    "slug": _slug(gkey),
                    "score": 0,
                    "peak": None,
                    "event_count": 0,
                    "sum_score": 0,
                    "latest": None,
                    "reg_set": set(),
                    "paper": 0,
                    "mandates": 0,
                }
                groups[gkey] = g
            g["event_count"] += 1
            g["sum_score"] += e.score or 0
            if (e.score or 0) > g["score"]:
                g["score"] = e.score or 0
                g["peak"] = e
            d = e.event_date
            if d and (g["latest"] is None or d > g["latest"]):
                g["latest"] = d
            g["reg_set"].add(e.regulator or "CDSCO")
            if _is_paper_event(e):
                g["paper"] += 1
            a = e.llm_analysis or {}
            if (e.event_date and e.event_date >= MANDATE_START) and any(
                    a.get(k) for k in ("violates_rule_96", "violates_sub_rule_7", "violates_schedule_h2")):
                g["mandates"] += 1

        items = [{
            "company_key": g["gkey"],
            "name": g["name"],
            "slug": g["slug"],
            "score": g["score"],
            "event_count": g["event_count"],
            "avg_score": round(g["sum_score"] / g["event_count"], 1),
            "latest_date": str(g["latest"]) if g["latest"] else "",
            "regulators": sorted(g["reg_set"]),
            "paper_count": g["paper"],
            "mandate_count": g["mandates"],
        } for g in groups.values()]
        items.sort(key=lambda x: (-x["score"], x["name"].lower()))

        total = len(items)
        page_items = items[(page - 1) * page_size: page * page_size]
        return {
            "items": page_items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }
    finally:
        db.close()


def get_company_signals(slug: str) -> dict:
    """Full company detail page: summary + all grouped event cards."""
    db = SessionLocal()
    try:
        events = db.query(RegulatoryEvent).all()
        groups = {}
        for e in events:
            mfr = (e.raw_details or {}).get("manufacturer", "")
            gkey = _group_key(mfr)
            if gkey:
                groups.setdefault(gkey, []).append(e)

        target = None
        for gkey, evs in groups.items():
            if _slug(gkey) == slug:
                target = (gkey, evs)
                break
        if target is None:
            return {"error": "Company not found"}
        gkey, evs = target
        evs.sort(key=lambda e: e.score, reverse=True)

        mfr0 = (evs[0].raw_details or {}).get("manufacturer", "")
        ckey = company_key(mfr0)
        counts = _prior_event_counts(db)
        web_by_key = _load_web_evidence(db)
        checks_by_key, evidence_by_key = _load_enrichment(db, {ckey} if ckey else set())

        cards = [_build_signal_card(e, counts, checks_by_key, evidence_by_key, web_by_key, db)
                 for e in evs]
        card = cards[0]
        if len(cards) > 1:
            card["event_count"] = len(cards)
            card["events"] = cards[1:]

        dates = [e.event_date for e in evs if e.event_date]
        summary = {
            "company_key": gkey,
            "name": clean_company_name(PAREN.sub("", mfr0)) or gkey,
            "slug": slug,
            "score": card["score"],
            "event_count": len(evs),
            "avg_score": round(sum(e.score or 0 for e in evs) / len(evs), 1),
            "latest_date": str(max(dates)) if dates else "",
            "regulators": sorted({e.regulator or "CDSCO" for e in evs}),
            "years": sorted({str(d)[:4] for d in dates}),
            "paper_count": sum(1 for e in evs if _is_paper_event(e)),
            "mandate_count": sum(1 for e in evs if
                e.event_date and e.event_date >= MANDATE_START and any(
                    (e.llm_analysis or {}).get(k)
                    for k in ("violates_rule_96", "violates_sub_rule_7", "violates_schedule_h2"))),
            "evidence_count": len(evidence_by_key.get(ckey, [])),
            "web_evidence_count": sum(len(v) for k, v in web_by_key.items() if k == gkey),
        }

        db.commit()
        return {"company": summary, "card": card}
    finally:
        db.close()


def get_web_evidence(event_id: str) -> dict:
    """Retrieve stored web evidence for a regulatory record."""
    db = SessionLocal()
    try:
        evidence = db.query(WebEvidence).filter(
            WebEvidence.event_id == event_id
        ).order_by(WebEvidence.relevance_score.desc()).all()

        return {
            "event_id": event_id,
            "evidence": [
                {
                    "id": str(e.id),
                    "title": e.title,
                    "url": e.url,
                    "source": e.source,
                    "published_date": str(e.published_date) if e.published_date else None,
                    "snippet": e.snippet,
                    "classification": e.classification or {},
                    "relevance_score": e.relevance_score,
                    "fetch_status": e.fetch_status,
                    "fetched_at": str(e.fetched_at) if e.fetched_at else None,
                }
                for e in evidence
            ],
        }
    finally:
        db.close()


def get_lead(company_name: str) -> dict:
    """Retrieve researched lead data for a company: decision makers, contacts,
    hiring, activity signals, QMS triggers, website and status."""
    db = SessionLocal()
    try:
        key = _group_key(company_name)
        row = db.query(CompanyLead).filter(CompanyLead.company_key == key).first()
        if row is None:
            rows = db.query(CompanyLead).all()
            for r in rows:
                if key and (key == (r.company_key or "") or key in (r.company_key or "") or (r.company_key or "") in key):
                    row = r
                    break
            if row is None:
                for r in rows:
                    if (r.company_name or "").lower().strip() == company_name.lower().strip():
                        row = r
                        break
        if row is None:
            return {"error": "No researched lead found for this company. Research it first via the Leads page."}
        return {
            "company_key": row.company_key,
            "company_name": row.company_name,
            "company_status": row.company_status,
            "website": row.website,
            "linkedin_url": row.linkedin_url,
            "decision_makers": row.decision_makers or [],
            "hiring": row.hiring or [],
            "hiring_news": row.hiring_news or [],
            "intent_signals": row.intent_signals or [],
            "trigger_events": row.trigger_events or [],
            "activity_summary": row.activity_summary,
            "scraped_data": row.scraped_data or {},
            "corporate_registry": row.corporate_registry or {},
            "status": row.status,
        }
    finally:
        db.close()


def get_company_phones(company_name: str) -> dict:
    """Phone numbers scraped from a company's own website, labelled by use."""
    db = SessionLocal()
    try:
        key = _group_key(company_name)
        lead = None
        if key:
            lead = db.query(CompanyLead).filter(CompanyLead.company_key == key).first()
        if lead is None:
            rows = db.query(CompanyLead).all()
            for r in rows:
                if key and (key in (r.company_key or "") or (r.company_key or "") in key):
                    lead = r
                    break
            if lead is None:
                for r in rows:
                    if (r.company_name or "").lower().strip() == company_name.lower().strip():
                        lead = r
                        break
        if lead is None:
            return {"error": "No researched lead found for this company."}
        phones = db.query(CompanyPhone)\
            .filter(CompanyPhone.company_key == lead.company_key)\
            .order_by(CompanyPhone.label, CompanyPhone.found_at)\
            .all()
        return {
            "company_key": lead.company_key,
            "company_name": lead.company_name,
            "website": lead.website,
            "phones": [{
                "phone": p.phone,
                "label": p.label,
                "page_url": p.page_url,
                "context": p.context,
                "tel_href": p.tel_href,
                "found_at": str(p.found_at) if p.found_at else None,
            } for p in phones],
        }
    finally:
        db.close()
