import json
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quotation import Quotation
from app.models.quotation_version import QuotationVersion
from app.models.user import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationUpdate,
    QuotationResponse,
    QuotationListItem,
    QuotationListPage,
    QuotationLineItem,
    QuotationLineItemResponse,
    QuotationVersionMeta,
)


QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"]


def compute_totals(items: list[QuotationLineItem], tax_pct: float) -> dict:
    subtotal = 0.0
    discount_total = 0.0
    built = []
    for it in items:
        gross = (it.qty or 0) * (it.unit_price or 0)
        disc = gross * (it.discount_pct or 0) / 100.0
        line_total = gross - disc
        subtotal += gross
        discount_total += disc
        built.append(
            QuotationLineItemResponse(
                category=it.category,
                description=it.description,
                qty=it.qty,
                unit=it.unit,
                unit_price=it.unit_price,
                type=it.type,
                discount_pct=it.discount_pct,
                line_total=round(line_total, 2),
            )
        )
    net = subtotal - discount_total
    tax_amount = net * (tax_pct or 0) / 100.0
    total = net + tax_amount
    return {
        "line_items": built,
        "subtotal": round(subtotal, 2),
        "discount_total": round(discount_total, 2),
        "tax_pct": tax_pct or 0,
        "tax_amount": round(tax_amount, 2),
        "total": round(total, 2),
    }


async def _next_quote_number(db: AsyncSession) -> str:
    year = datetime.now(timezone.utc).year
    count = (await db.execute(select(func.count(Quotation.id)))).scalar() or 0
    return f"Q-{year}-{count + 1:04d}"


def _to_response(q: Quotation, line_items: list[QuotationLineItemResponse]) -> QuotationResponse:
    return QuotationResponse(
        id=q.id,
        company_key=q.company_key,
        company_name=q.company_name,
        quote_number=q.quote_number,
        status=q.status,
        currency=q.currency,
        title=q.title,
        valid_until=q.valid_until,
        intro=q.intro,
        terms=q.terms,
        notes=q.notes,
        line_items=line_items,
        subtotal=float(q.subtotal),
        discount_total=float(q.discount_total),
        tax_pct=float(q.tax_pct),
        tax_amount=float(q.tax_amount),
        total=float(q.total),
        owner_id=q.owner_id,
        owner_email=q.owner_email,
        version=q.version,
        html=q.html,
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


async def list_quotations(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 30,
    company_key: str | None = None,
    status: str | None = None,
    q: str | None = None,
) -> QuotationListPage:
    query = select(Quotation)
    count_query = select(func.count(Quotation.id))
    if company_key:
        query = query.where(Quotation.company_key == company_key)
        count_query = count_query.where(Quotation.company_key == company_key)
    if status:
        query = query.where(Quotation.status == status)
        count_query = count_query.where(Quotation.status == status)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(Quotation.company_name.ilike(pattern) | Quotation.title.ilike(pattern))
        count_query = count_query.where(Quotation.company_name.ilike(pattern) | Quotation.title.ilike(pattern))

    total = (await db.execute(count_query)).scalar_one()
    pages = max((total + page_size - 1) // page_size, 1)
    page = max(min(page, pages), 1)

    result = await db.execute(
        query.order_by(Quotation.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = [
        QuotationListItem(
            id=qq.id,
            company_key=qq.company_key,
            company_name=qq.company_name,
            quote_number=qq.quote_number,
            status=qq.status,
            currency=qq.currency,
            title=qq.title,
            total=float(qq.total),
            valid_until=qq.valid_until,
            version=qq.version,
            updated_at=qq.updated_at,
        )
        for qq in result.scalars().all()
    ]
    return QuotationListPage(items=items, total=total, page=page, page_size=page_size, pages=pages)


async def get_quotation(db: AsyncSession, quotation_id: str) -> QuotationResponse | None:
    qq = (await db.execute(select(Quotation).where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not qq:
        return None
    items = [QuotationLineItem(**it) for it in (qq.line_items or [])]
    totals = compute_totals(items, float(qq.tax_pct))
    return _to_response(qq, totals["line_items"])


async def create_quotation(db: AsyncSession, data: QuotationCreate, actor: User) -> QuotationResponse:
    items = [QuotationLineItem(**it.model_dump()) for it in data.line_items]
    totals = compute_totals(items, data.tax_pct)
    qq = Quotation(
        company_key=data.company_key,
        company_name=data.company_name,
        quote_number=await _next_quote_number(db),
        status=data.status or "draft",
        currency=data.currency or "USD",
        title=data.title or "Commercial Proposal",
        valid_until=data.valid_until,
        intro=data.intro,
        terms=data.terms,
        notes=data.notes,
        line_items=[it.model_dump() for it in items],
        tax_pct=totals["tax_pct"],
        subtotal=totals["subtotal"],
        discount_total=totals["discount_total"],
        tax_amount=totals["tax_amount"],
        total=totals["total"],
        owner_id=actor.id,
        owner_email=actor.email,
    )
    db.add(qq)
    await db.commit()
    await db.refresh(qq)
    await _safe_record_version(db, qq, actor)
    return _to_response(qq, totals["line_items"])


async def update_quotation(
    db: AsyncSession,
    quotation_id: str,
    data: QuotationUpdate,
    expected_version: int | None = None,
    actor: User | None = None,
) -> QuotationResponse | None:
    qq = (await db.execute(select(Quotation).where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not qq:
        return None
    if expected_version is not None and qq.version != expected_version:
        raise ConcurrencyConflict()

    update = data.model_dump(exclude_unset=True)
    items = None
    if "line_items" in update and update["line_items"] is not None:
        items = [QuotationLineItem(**it.model_dump()) for it in update["line_items"]]
        qq.line_items = [it.model_dump() for it in items]
    else:
        items = [QuotationLineItem(**it) for it in (qq.line_items or [])]

    tax_pct = float(update.get("tax_pct", qq.tax_pct) or 0)
    totals = compute_totals(items, tax_pct)

    for field in ("title", "currency", "status", "valid_until", "intro", "terms", "notes"):
        if field in update and update[field] is not None:
            setattr(qq, field, update[field])
    if "tax_pct" in update and update["tax_pct"] is not None:
        qq.tax_pct = tax_pct
    qq.subtotal = totals["subtotal"]
    qq.discount_total = totals["discount_total"]
    qq.tax_amount = totals["tax_amount"]
    qq.total = totals["total"]
    qq.html = None  # structured edits regenerate the document on next render
    qq.version = (qq.version or 0) + 1
    await db.commit()
    await db.refresh(qq)
    await _safe_record_version(db, qq, actor)
    return _to_response(qq, totals["line_items"])


async def delete_quotation(db: AsyncSession, quotation_id: str) -> bool:
    qq = (await db.execute(select(Quotation).where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not qq:
        return False
    await db.delete(qq)
    await db.commit()
    return True


async def duplicate_quotation(db: AsyncSession, quotation_id: str, actor: User) -> QuotationResponse | None:
    qq = (await db.execute(select(Quotation).where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not qq:
        return None
    items = [QuotationLineItem(**it) for it in (qq.line_items or [])]
    totals = compute_totals(items, float(qq.tax_pct))
    new = Quotation(
        company_key=qq.company_key,
        company_name=qq.company_name,
        quote_number=await _next_quote_number(db),
        status="draft",
        currency=qq.currency,
        title=qq.title,
        valid_until=qq.valid_until,
        intro=qq.intro,
        terms=qq.terms,
        notes=qq.notes,
        line_items=qq.line_items,
        tax_pct=qq.tax_pct,
        subtotal=qq.subtotal,
        discount_total=qq.discount_total,
        tax_amount=qq.tax_amount,
        total=qq.total,
        owner_id=actor.id,
        owner_email=actor.email,
    )
    db.add(new)
    await db.commit()
    await db.refresh(new)
    await _safe_record_version(db, new, actor)
    return _to_response(new, totals["line_items"])


CURRENCY_SYMBOLS: dict[str, str] = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "CNY": "¥", "INR": "₹",
    "AUD": "A$", "CAD": "C$", "CHF": "Fr", "SGD": "S$", "HKD": "HK$",
    "NZD": "NZ$", "SEK": "kr", "NOK": "kr", "DKK": "kr", "ZAR": "R",
    "BRL": "R$", "MXN": "$", "KRW": "₩", "THB": "฿", "IDR": "Rp",
    "MYR": "RM", "PHP": "₱", "TRY": "₺", "ILS": "₪", "EGP": "E£",
}

MIDDLE_EAST_CURRENCIES = ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "LBP"]


def _money(amount: float, currency: str) -> str:
    """Format an amount with a currency symbol when widely renderable, otherwise
    fall back to the ISO code (always renders, incl. Gulf/Middle East currencies
    whose glyphs may not be available in the preview font)."""
    cur = (currency or "USD").upper()
    if cur in CURRENCY_SYMBOLS:
        return f"{CURRENCY_SYMBOLS[cur]}{amount:,.2f}"
    return f"{cur} {amount:,.2f}"


def render_html(q: QuotationResponse) -> str:
    """Return the stored edited document if present, otherwise generate one
    from the structured data (mirrors the AIVOA LIMS example: header + ref/date/
    validity, prepared-for, executive overview, one-time vs annual pricing boxes,
    payment terms, acceptance & authorization)."""
    if q.html:
        return q.html
    one_time = [li for li in q.line_items if li.type == "one_time"]
    recurring = [li for li in q.line_items if li.type == "recurring"]

    def box_items(items):
        if not items:
            return "<li class='muted'>No items in this category.</li>"
        out = ""
        for li in items:
            label = f"<span class='cat'>{li.category}</span>" if li.category else ""
            disc = f" <span class='disc'>-{li.discount_pct}%</span>" if li.discount_pct else ""
            out += (
                f"<li><div class='li-head'>{label}<span>{li.description or 'Item'}</span>"
                f"<span class='amt'>{_money(li.line_total, q.currency)}</span></div>"
                f"<div class='li-sub'>{li.qty} {li.unit}{disc}</div></li>"
            )
        return out

    def box_total(items):
        return sum(li.line_total for li in items)

    valid = q.valid_until.isoformat() if q.valid_until else "—"
    issued = q.created_at.strftime("%B %d, %Y") if q.created_at else "—"
    status_label = q.status.title()

    tax_rate = q.tax_pct or 0
    tax_row = (
        f"<div class='row'><span>Tax ({tax_rate:g}%)</span><span>{_money(q.tax_amount, q.currency)}</span></div>"
        if tax_rate > 0
        else "<div class='row'><span>Tax</span><span>As applicable</span></div>"
    )

    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>{q.quote_number} - {q.company_name}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
 body{{font-family:Inter,system-ui,sans-serif;background:#eef2f7;color:#0f172a;margin:0;padding:32px}}
 .sheet{{max-width:900px;margin:0 auto;background:#fff;box-shadow:0 12px 40px rgba(15,23,42,.12)}}
 .top{{background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);color:#fff;padding:38px 46px}}
 .eyebrow{{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#93c5fd;font-weight:700}}
 .top h1{{margin:6px 0 0;font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1.2}}
 .top .sub{{margin-top:8px;opacity:.85;font-size:14px}}
 .meta{{display:flex;flex-wrap:wrap;gap:28px;padding:22px 46px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#475569}}
 .meta div b{{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:3px;font-weight:700}}
 .meta .val{{color:#0f172a;font-weight:600}}
 .badge{{display:inline-block;padding:3px 10px;border-radius:999px;background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;text-transform:uppercase}}
 .prepared{{padding:22px 46px;background:#f8fafc;border-bottom:1px solid #e2e8f0}}
 .prepared .lbl{{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#1e3a8a;font-weight:800}}
 .prepared .name{{font-size:18px;font-weight:800;color:#0f172a;margin-top:4px}}
 .section{{padding:28px 46px}}
 .section h2{{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#1e3a8a;margin:0 0 14px;font-weight:800}}
 .intro{{color:#334155;font-size:14px;line-height:1.7;white-space:pre-wrap}}
 .boxes{{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:6px}}
 .box{{border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}}
 .box .bh{{background:#0f172a;color:#fff;padding:12px 16px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}}
 .box.rec .bh{{background:#1e3a8a}}
 .box ul{{list-style:none;margin:0;padding:10px 16px}}
 .box li{{padding:10px 0;border-bottom:1px solid #f1f5f9}}
 .box li:last-child{{border-bottom:none}}
 .cat{{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a;font-weight:700}}
 .li-head{{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#0f172a}}
 .li-head .amt{{font-weight:800;white-space:nowrap}}
 .li-sub{{font-size:11px;color:#94a3b8;margin-top:2px}}
 .disc{{color:#dc2626}}
 .box .bf{{padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-weight:800;font-size:14px}}
 .totals{{margin-left:auto;width:340px;font-size:14px;margin-top:18px}}
 .totals .row{{display:flex;justify-content:space-between;padding:6px 0}}
 .totals .grand{{font-size:21px;font-weight:900;border-top:2px solid #e2e8f0;margin-top:6px;padding-top:10px}}
 .terms{{background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;white-space:pre-wrap;line-height:1.7}}
 .sign{{display:grid;grid-template-columns:1fr 1fr;gap:24px}}
 .sign .blk{{border-top:1px solid #cbd5e1;padding-top:10px;font-size:12px;color:#475569}}
 .sign .blk b{{display:block;color:#0f172a;font-size:13px;margin-bottom:2px}}
 .foot{{padding:18px 46px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between}}
 .muted{{color:#94a3b8}}
 @media print{{body{{padding:0;background:#fff}} .sheet{{box-shadow:none;max-width:100%}}}}
 @media (max-width:640px){{.boxes,.sign{{grid-template-columns:1fr}} .totals{{width:100%}}}}
</style></head>
<body><div class="sheet">
 <div class="top">
  <div class="eyebrow">Commercial Proposal</div>
  <h1>{q.title}</h1>
  <div class="sub">Prepared for {q.company_name}</div>
 </div>
 <div class="meta">
  <div><b>Proposal Ref</b><span class="val">{q.quote_number}</span></div>
  <div><b>Date</b><span class="val">{issued}</span></div>
  <div><b>Validity</b><span class="val">{valid}</span></div>
  <div><b>Status</b><span class="badge">{status_label}</span></div>
  <div><b>Currency</b><span class="val">{q.currency}</span></div>
 </div>
 <div class="prepared">
  <div class="lbl">Prepared For</div>
  <div class="name">{q.company_name}</div>
 </div>
 <div class="section">
  <h2>1 · Executive Overview</h2>
  <div class="intro">{q.intro or '—'}</div>
 </div>
 <div class="section">
  <h2>2 · Investment Summary</h2>
  <div class="boxes">
   <div class="box">
    <div class="bh">One-Time Investment</div>
    <ul>{box_items(one_time)}</ul>
    <div class="bf"><span>One-Time Total</span><span>{_money(box_total(one_time), q.currency)}</span></div>
   </div>
   <div class="box rec">
    <div class="bh">Annual Subscription</div>
    <ul>{box_items(recurring)}</ul>
    <div class="bf"><span>Annual Total</span><span>{_money(box_total(recurring), q.currency)}</span></div>
   </div>
  </div>
   <div class="totals">
    <div class="row"><span>Subtotal</span><span>{_money(q.subtotal, q.currency)}</span></div>
    <div class="row"><span>Discount</span><span>-{_money(q.discount_total, q.currency)}</span></div>
    {tax_row}
    <div class="row grand"><span>Total Investment</span><span>{_money(q.total, q.currency)}</span></div>
   </div>
 </div>
 <div class="section terms">
  <h2>3 · Payment Terms &amp; Conditions</h2>
  {q.terms or 'Standard payment terms apply. 50% advance with purchase order, 40% on UAT completion, 10% on go-live. Net 30.'}
 </div>
 <div class="section">
  <h2>4 · Acceptance &amp; Authorization</h2>
  <p class="muted" style="font-size:13px;margin:0 0 16px">By signing below, the parties agree to the scope, commercial terms, and conditions outlined in this proposal.</p>
  <div class="sign">
   <div class="blk"><b>For {q.company_name}</b>Accepted &amp; Approved By<br><br><br>Name / Title / Date</div>
   <div class="blk"><b>Authorized Signatory</b>Seller Representative<br><br><br>Name / Title / Date</div>
  </div>
 </div>
   <div class="foot">
    <span>Quote {q.quote_number} · version {q.version}</span>
    <span>Generated by the sales platform</span>
   </div>
  </div></body></html>"""
    if q.notes:
        notes_html = f'<div class="section"><h2>5 · Notes</h2><div class="intro">{q.notes}</div></div>'
        html = html.replace("  <div class=\"foot\">", notes_html + "\n  <div class=\"foot\">")
    return html


async def render_preview(
    db: AsyncSession, quotation_id: str, data: QuotationUpdate | None
) -> str | None:
    """Render a proposal. When `data` is supplied (the live form), the render
    reflects the in-progress edits so the preview always matches the form."""
    q = await get_quotation(db, quotation_id)
    if not q:
        return None
    if data is None:
        return render_html(q)

    update = data.model_dump(exclude_unset=True)
    if "line_items" in update and update["line_items"] is not None:
        items = [QuotationLineItem(**it.model_dump()) for it in update["line_items"]]
        q.line_items = [it.model_dump() for it in items]
    else:
        items = [QuotationLineItem(**it) for it in (q.line_items or [])]
    tax_pct = float(update.get("tax_pct", q.tax_pct) or 0)
    totals = compute_totals(items, tax_pct)
    for field in ("title", "currency", "status", "valid_until", "intro", "terms", "notes"):
        if field in update and update[field] is not None:
            setattr(q, field, update[field])
    if "tax_pct" in update and update["tax_pct"] is not None:
        q.tax_pct = tax_pct
    q.subtotal = totals["subtotal"]
    q.discount_total = totals["discount_total"]
    q.tax_amount = totals["tax_amount"]
    q.total = totals["total"]
    q.html = None  # force regeneration from the live form
    resp = _to_response(q, totals["line_items"])
    return render_html(resp)



async def _record_version(db: AsyncSession, qq: Quotation, actor: User | None) -> None:
    """Persist an immutable snapshot of the quotation's current state."""
    items = [QuotationLineItem(**it) for it in (qq.line_items or [])]
    totals = compute_totals(items, float(qq.tax_pct))
    resp = _to_response(qq, totals["line_items"])
    rendered = qq.html or render_html(resp)
    snapshot = {
        "company_key": qq.company_key,
        "company_name": qq.company_name,
        "title": qq.title,
        "currency": qq.currency,
        "status": qq.status,
        "valid_until": qq.valid_until.isoformat() if qq.valid_until else None,
        "intro": qq.intro,
        "terms": qq.terms,
        "notes": qq.notes,
        "tax_pct": qq.tax_pct,
        "line_items": qq.line_items,
        "subtotal": float(qq.subtotal),
        "discount_total": float(qq.discount_total),
        "tax_amount": float(qq.tax_amount),
        "total": float(qq.total),
    }
    safe = json.loads(
        json.dumps(
            snapshot,
            default=lambda o: float(o) if isinstance(o, Decimal) else (o.isoformat() if isinstance(o, (date, datetime)) else str(o)),
        )
    )
    v = QuotationVersion(
        quotation_id=qq.id,
        version=qq.version,
        data=safe,
        html=rendered,
        created_by_id=actor.id if actor else None,
        created_by_email=actor.email if actor else None,
    )
    db.add(v)
    await db.commit()


async def _safe_record_version(db: AsyncSession, qq: Quotation, actor: User | None) -> None:
    """Record a version snapshot but never let a snapshot failure break the
    primary save. The version history is a safety net, not critical path."""
    try:
        await _record_version(db, qq, actor)
    except Exception as e:
        await db.rollback()
        import logging

        logging.getLogger(__name__).warning("Failed to record quotation version: %s: %s", type(e).__name__, e)


async def list_versions(db: AsyncSession, quotation_id: str) -> list[QuotationVersionMeta]:
    result = await db.execute(
        select(QuotationVersion)
        .where(QuotationVersion.quotation_id == quotation_id)
        .order_by(QuotationVersion.version.desc())
    )
    rows = result.scalars().all()
    return [
        QuotationVersionMeta(
            version=v.version,
            created_at=v.created_at,
            created_by_email=v.created_by_email,
            status=(v.data or {}).get("status", ""),
            total=float((v.data or {}).get("total", 0)),
            has_html=bool(v.html),
        )
        for v in rows
    ]


async def get_version(db: AsyncSession, quotation_id: str, version: int) -> QuotationVersion | None:
    return (
        await db.execute(
            select(QuotationVersion).where(
                QuotationVersion.quotation_id == quotation_id,
                QuotationVersion.version == version,
            )
        )
    ).scalar_one_or_none()


async def restore_version(
    db: AsyncSession, quotation_id: str, version: int, actor: User | None
) -> QuotationResponse | None:
    v = await get_version(db, quotation_id, version)
    if not v:
        return None
    qq = (
        await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    ).scalar_one_or_none()
    if not qq:
        return None
    snap = v.data or {}
    valid = snap.get("valid_until")
    qq.title = snap.get("title", qq.title)
    qq.currency = snap.get("currency", qq.currency)
    qq.status = snap.get("status", qq.status)
    qq.valid_until = date.fromisoformat(valid) if valid else None
    qq.intro = snap.get("intro")
    qq.terms = snap.get("terms")
    qq.notes = snap.get("notes")
    qq.tax_pct = snap.get("tax_pct", 0)
    qq.line_items = snap.get("line_items", qq.line_items)
    qq.subtotal = snap.get("subtotal", qq.subtotal)
    qq.discount_total = snap.get("discount_total", qq.discount_total)
    qq.tax_amount = snap.get("tax_amount", qq.tax_amount)
    qq.total = snap.get("total", qq.total)
    qq.html = v.html
    qq.version = (qq.version or 0) + 1
    await db.commit()
    await db.refresh(qq)
    items = [QuotationLineItem(**it) for it in (qq.line_items or [])]
    totals = compute_totals(items, float(qq.tax_pct))
    await _safe_record_version(db, qq, actor)
    return _to_response(qq, totals["line_items"])


async def save_document(
    db: AsyncSession,
    quotation_id: str,
    html: str,
    expected_version: int | None = None,
    actor: User | None = None,
) -> QuotationResponse | None:
    """Persist an edited proposal document (e.g. inline tweaks from the preview)."""
    qq = (await db.execute(select(Quotation).where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not qq:
        return None
    if expected_version is not None and qq.version != expected_version:
        raise ConcurrencyConflict()
    qq.html = html
    qq.version = (qq.version or 0) + 1
    await db.commit()
    await db.refresh(qq)
    items = [QuotationLineItem(**it) for it in (qq.line_items or [])]
    totals = compute_totals(items, float(qq.tax_pct))
    await _safe_record_version(db, qq, actor)
    return _to_response(qq, totals["line_items"])


async def reset_document(
    db: AsyncSession,
    quotation_id: str,
    actor: User | None = None,
) -> QuotationResponse | None:
    """Clear the stored document so renders regenerate from structured data."""
    qq = (await db.execute(select(Quotation).where(Quotation.id == quotation_id))).scalar_one_or_none()
    if not qq:
        return None
    qq.html = None
    qq.version = (qq.version or 0) + 1
    await db.commit()
    await db.refresh(qq)
    items = [QuotationLineItem(**it) for it in (qq.line_items or [])]
    totals = compute_totals(items, float(qq.tax_pct))
    await _safe_record_version(db, qq, actor)
    return _to_response(qq, totals["line_items"])


class ConcurrencyConflict(Exception):
    pass
