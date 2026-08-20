import json
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from playwright.async_api import async_playwright
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


def compute_totals(items: list[QuotationLineItem]) -> dict:
    subtotal = 0.0
    discount_total = 0.0
    tax_amount = 0.0
    built = []
    for it in items:
        gross = (it.qty or 0) * (it.unit_price or 0)
        disc = gross * (it.discount_pct or 0) / 100.0
        net = gross - disc
        item_tax = net * (it.tax_pct or 0) / 100.0
        line_total = net + item_tax
        subtotal += gross
        discount_total += disc
        tax_amount += item_tax
        built.append(
            QuotationLineItemResponse(
                category=it.category,
                description=it.description,
                qty=it.qty,
                unit=it.unit,
                unit_price=it.unit_price,
                type=it.type,
                discount_pct=it.discount_pct,
                tax_pct=it.tax_pct,
                line_total=round(line_total, 2),
            )
        )
    net_total = subtotal - discount_total
    total = net_total + tax_amount
    return {
        "line_items": built,
        "subtotal": round(subtotal, 2),
        "discount_total": round(discount_total, 2),
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
        scope=q.scope,
        modules=q.modules or [],
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
    totals = compute_totals(items)
    return _to_response(qq, totals["line_items"])


async def create_quotation(db: AsyncSession, data: QuotationCreate, actor: User) -> QuotationResponse:
    items = [QuotationLineItem(**it.model_dump()) for it in data.line_items]
    totals = compute_totals(items)
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
        scope=data.scope,
        modules=[m.model_dump() for m in (data.modules or [])],
        notes=data.notes,
        line_items=[it.model_dump() for it in items],
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
        items = [QuotationLineItem(**it) for it in update["line_items"]]
        qq.line_items = update["line_items"]
    else:
        items = [QuotationLineItem(**it) for it in (qq.line_items or [])]

    tax_pct = float(update.get("tax_pct", qq.tax_pct) or 0)
    totals = compute_totals(items)

    if "modules" in update and update["modules"] is not None:
        qq.modules = [m for m in update["modules"]]

    for field in ("title", "currency", "status", "valid_until", "intro", "terms", "scope", "notes"):
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
    totals = compute_totals(items)
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
        scope=qq.scope,
        modules=qq.modules,
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

    def line_amt(li):
        gross = (li.qty or 0) * (li.unit_price or 0)
        net = gross - gross * (li.discount_pct or 0) / 100
        tax = net * (li.tax_pct or 0) / 100
        return net, tax

    def box_items(items):
        if not items:
            return "<li class='muted'>No items in this category.</li>"
        out = ""
        for li in items:
            label = f"<span class='cat'>{li.category}</span>" if li.category else ""
            disc = f" <span class='disc'>-{li.discount_pct:g}%</span>" if li.discount_pct else ""
            net, tax = line_amt(li)
            tax_str = f" <span class='tax' style='font-size: 0.85em; color: #64748b;'>+ {_money(tax, q.currency)} tax</span>" if tax else ""
            out += (
                f"<li>"
                f"<div class='li-head'>{label}<span class='amt'>{_money(net, q.currency)}</span></div>"
                f"<div class='d prose' style='font-size:13px; margin-top:0.5em; margin-bottom:0.5em'>{li.description or 'Item'}</div>"
                f"<div class='li-sub'>{li.qty:g} {li.unit or ''} × {_money(li.unit_price, q.currency)}{disc}{tax_str}</div>"
                f"</li>"
            )
        return out

    def box_total(items):
        net_total = sum(line_amt(li)[0] for li in items)
        tax_total = sum(line_amt(li)[1] for li in items)
        return net_total, tax_total

    valid = q.valid_until.isoformat() if q.valid_until else "—"
    issued = q.created_at.strftime("%B %d, %Y") if q.created_at else "—"
    status_label = q.status.title()
    intro_html = q.intro or (
        f"This proposal summarizes the proposed solution, commercial scope, and "
        f"investment for <b>{q.company_name}</b>."
    )
    terms_html = q.terms or (
        "Standard payment terms apply: 50% advance with purchase order, "
        "40% on UAT completion, 10% on go-live. Net 30."
    )
    if q.modules and len(q.modules) > 0:
        modules_html = '<div class="mod-grid">'
        for m in q.modules:
            if hasattr(m, "model_dump"):
                m_dict = m.model_dump()
            elif isinstance(m, dict):
                m_dict = m
            else:
                m_dict = getattr(m, "__dict__", {})

            title = m_dict.get("title", "")
            items = m_dict.get("items", [])
            icon = m_dict.get("icon", "document")
            # SVG mapping based on icon string
            svgs = {
                "shield": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>',
                "alert": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
                "document": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>',
                "users": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>',
                "truck": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>',
                "clipboard": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>',
                "database": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>',
                "flask": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>',
                "box": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>',
                "settings": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>',
                "cpu": '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>'
            }
            svg_path = svgs.get(icon, svgs["document"])
            
            items_html = ""
            for item in items:
                # Parse AI badge
                if "✨ AI" in item:
                    item_text = item.replace("✨ AI", "").strip()
                    item_display = f'<span class="text">{item_text}</span><span class="ai-badge">✨ AI</span>'
                else:
                    item_display = f'<span class="text">{item}</span>'
                
                items_html += f'''
                    <li>
                        <span class="check">✔</span>
                        {item_display}
                    </li>
                '''

            modules_html += f'''
                <div class="mod-card">
                    <div class="mod-card-header">
                        <div class="mod-card-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">{svg_path}</svg>
                        </div>
                        <h3 class="mod-card-title">{title}</h3>
                    </div>
                    <ul>
                        {items_html}
                    </ul>
                </div>
            '''
        modules_html += '</div>'
    else:
        modules_html = ""

    scope_prose = q.scope or (
        "The functional scope, architecture, and deliverables for this engagement "
        "will be tailored specifically to your requirements."
    )

    tax_rate = q.tax_pct or 0
    tax_row = (
        f"<div class='row'><span>Tax ({tax_rate:g}%)</span><span>{_money(q.tax_amount, q.currency)}</span></div>"
        if tax_rate > 0
        else "<div class='row'><span>Tax</span><span>As applicable</span></div>"
    )

    html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>{q.quote_number} - {q.company_name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
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
 .section h2{{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#1e3a8a;margin:0 0 14px;font-weight:800;page-break-after:avoid;break-after:avoid}}
  .intro{{color:#334155;font-size:14px;line-height:1.7;white-space:pre-wrap}}
  .prose{{color:#334155;font-size:14px;line-height:1.7;white-space:pre-wrap}}
  .prose p{{margin:0 0 10px}}
  .prose ul{{margin:0 0 10px;padding-left:20px;list-style:disc}}
  .prose ol{{margin:0 0 10px;padding-left:20px;list-style:decimal}}
  .prose b,.prose strong{{font-weight:700;color:#0f172a}}
  .prose i,.prose em{{font-style:italic}}
  .prose u{{text-decoration:underline}}
  .prose h1{{font-size:24px;font-weight:800;color:#0f172a;margin:16px 0 12px;line-height:1.3}}
  .prose h2{{font-size:20px;font-weight:700;color:#0f172a;margin:16px 0 10px;line-height:1.3}}
  .prose h3{{font-size:16px;font-weight:700;color:#0f172a;margin:14px 0 8px;line-height:1.4}}
  .prose h4{{font-size:14px;font-weight:700;color:#0f172a;margin:12px 0 8px}}
  .prose blockquote{{border-left:4px solid #cbd5e1;padding-left:16px;color:#475569;font-style:italic;margin:12px 0}}
  .prose span, .prose font {{ color: inherit !important; background-color: transparent !important; font-family: inherit !important; }}
 .boxes{{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:6px}}
 .box{{border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}}
 .box .bh{{background:#0f172a;color:#fff;padding:12px 16px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}}
 .box.rec .bh{{background:#1e3a8a}}
 .box > ul{{list-style:none;margin:0;padding:10px 16px}}
 .box > ul > li{{padding:10px 0;border-bottom:1px solid #f1f5f9}}
 .box > ul > li:last-child{{border-bottom:none}}
 .cat{{display:block;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a;font-weight:800}}
 .li-head{{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#0f172a}}
 .li-head .amt{{font-weight:800;white-space:nowrap}}
 .li-sub{{font-size:11px;color:#94a3b8;margin-top:2px}}
 .disc{{color:#dc2626}}
 .mod-grid{{display:grid;grid-template-columns:1fr 1fr;gap:24px;width:100%;margin-top:24px}}
 .mod-card{{border:1px solid #e5e7eb;border-radius:12px;padding:20px;background-color:#fff;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);page-break-inside:avoid;margin-bottom:16px}}
 .mod-card-header{{display:flex;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f3f4f6}}
 .mod-card-icon{{background-color:#f1f5f9;color:#334155;padding:8px;border-radius:8px;margin-right:12px;display:flex;align-items:center;justify-content:center}}
 .mod-card-icon svg{{width:20px;height:20px;display:block}}
 .mod-card-title{{font-weight:900;color:#1e293b;font-size:18px;margin:0}}
 .mod-card ul{{list-style:none !important;padding:0 !important;margin:0 0 0 4px !important}}
 .mod-card li{{display:flex;align-items:flex-start;padding:10px 0;border-bottom:none !important}}
 .mod-card li .check{{color:#22c55e;font-weight:700;margin-right:8px;margin-top:2px;font-size:14px}}
 .mod-card li .text{{flex:1;font-size:14px;color:#475569;font-weight:500;line-height:1.4}}
 .ai-badge{{display:inline-flex;align-items:center;border-radius:6px;background-color:#f5f3ff;padding:2px 8px;font-size:10px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.05em;margin-left:8px;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);border:1px solid rgba(109,40,217,0.2)}}
 .box .bf{{padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-weight:800;font-size:14px}}
 .totals{{margin-left:auto;width:340px;font-size:14px;margin-top:18px;page-break-inside:avoid;break-inside:avoid}}
 .totals .row{{display:flex;justify-content:space-between;padding:6px 0}}
 .totals .grand{{font-size:21px;font-weight:900;border-top:2px solid #e2e8f0;margin-top:6px;padding-top:10px}}
 .terms{{background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;white-space:pre-wrap;line-height:1.7}}
 .sign{{display:grid;grid-template-columns:1fr 1fr;gap:24px;page-break-inside:avoid;break-inside:avoid}}
 .sign .blk{{border-top:1px solid #cbd5e1;padding-top:10px;font-size:12px;color:#475569}}
 .sign .blk b{{display:block;color:#0f172a;font-size:13px;margin-bottom:2px}}
 .foot{{padding:18px 46px;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between}}
 .muted{{color:#94a3b8}}
 @media print{{body{{padding:0;background:#fff}} .sheet{{box-shadow:none;max-width:100%}} * {{-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important;}}}}
 @media (max-width:640px){{.boxes,.sign{{grid-template-columns:1fr}} .totals{{width:100%}}}}
</style></head>
<body><div class="sheet">
  <div class="top">
   <div class="eyebrow">Quotation · {q.quote_number}</div>
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
   <div class="prose" data-field="intro">{intro_html}</div>
  </div>
  <div class="section">
   <h2>2 · Functional Scope &amp; Architecture</h2>
   <div class="prose" data-field="scope">{scope_prose}</div>
   {modules_html}
  </div>
  <div class="section">
   <h2>3 · Investment Summary</h2>
    <div class="boxes">
     <div class="box">
      <div class="bh">One-Time Investment</div>
      <ul>{box_items(one_time)}</ul>
      <div class="bf">
        <span>One-Time Total</span>
        <div style="text-align: right">
          <div>{_money(box_total(one_time)[0], q.currency)}</div>
          <div style="font-size: 0.75em; font-weight: normal; color: #64748b; margin-top: 2px;">+ {_money(box_total(one_time)[1], q.currency)} Tax</div>
        </div>
      </div>
     </div>
     <div class="box rec">
      <div class="bh">Annual Subscription</div>
      <ul>{box_items(recurring)}</ul>
      <div class="bf">
        <span>Annual Total</span>
        <div style="text-align: right">
          <div>{_money(box_total(recurring)[0], q.currency)} / year</div>
          <div style="font-size: 0.75em; font-weight: normal; color: #64748b; margin-top: 2px;">+ {_money(box_total(recurring)[1], q.currency)} Tax / year</div>
        </div>
      </div>
     </div>
    </div>
  </div>
  <div class="section terms">
   <h2>4 · Payment Terms &amp; Conditions</h2>
   <div class="prose" data-field="terms">{terms_html}</div>
  </div>
  <div class="section">
   <h2>5 · Acceptance &amp; Authorization</h2>
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
        notes_html = f'<div class="section"><h2>6 · Notes</h2><div class="intro">{q.notes}</div></div>'
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
        items = [QuotationLineItem(**it) for it in update["line_items"]]
        q.line_items = update["line_items"]
    else:
        items = [QuotationLineItem(**it) for it in (q.line_items or [])]
    totals = compute_totals(items)
    if "modules" in update and update["modules"] is not None:
        q.modules = [m for m in update["modules"]]
    for field in ("title", "currency", "status", "valid_until", "intro", "terms", "scope", "notes"):
        if field in update and update[field] is not None:
            setattr(q, field, update[field])
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
    totals = compute_totals(items)
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
        "scope": qq.scope,
        "modules": qq.modules,
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
    finally:
        await db.refresh(qq)


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
    qq.scope = snap.get("scope")
    qq.modules = snap.get("modules", [])
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
    totals = compute_totals(items)
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
    totals = compute_totals(items)
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
    totals = compute_totals(items)
    await _safe_record_version(db, qq, actor)
    return _to_response(qq, totals["line_items"])


class ConcurrencyConflict(Exception):
    pass

async def generate_pdf(db: AsyncSession, quotation_id: str, data: QuotationUpdate | None = None) -> bytes | None:
    html_content = await render_preview(db, quotation_id, data)
    if not html_content:
        return None
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 800, "height": 1200})
        await page.set_content(html_content, wait_until="networkidle")
        await page.evaluate("document.fonts.ready")
        
        # Override CSS to force continuous page layout
        await page.add_style_tag(content='''
            @page { margin: 0; }
            body { padding: 0 !important; background: white !important; margin: 0 !important; }
            .sheet { max-width: 100% !important; box-shadow: none !important; margin: 0 !important; }
            /* Turn off page break avoidances since we don't want them doing weird things on a continuous page */
            * { page-break-inside: auto !important; page-break-after: auto !important; break-inside: auto !important; break-after: auto !important; }
        ''')
        
        # Calculate full height
        height = await page.evaluate("document.body.scrollHeight")
        # Add 50px buffer to be safe
        height += 50
        
        pdf_bytes = await page.pdf(
            width="800px",
            height=f"{height}px",
            print_background=True,
            page_ranges="1"
        )
        await browser.close()
        return pdf_bytes
