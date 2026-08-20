# Sales App — Quotation Module Summary

## Objective
- Build a Quotation module so sales reps generate branded, editable proposals per account, styled after the AIVOA LIMS example. Extended with **predefined editable templates** (LIMS / Global QMS / Domestic QMS) selectable when creating a quotation, plus a **Custom** option preserving the current model.

## Important Details
- Repo: `/home/many-wallnut/Desktop/sales-app`. Stack: FastAPI backend + React (Vite/TS) frontend, Docker Compose. Tables auto-created via `Base.metadata.create_all` into `sales_app` schema on shared remote Pharma DB; additive columns via idempotent `ensure_*_schema` in `backend/app/database.py` wired into `backend/app/main.py` lifespan.
- Build/test: `cd /home/many-wallnut/Desktop/sales-app && docker compose up -d --build backend frontend`. Frontend build runs `tsc -b && vite build` strict — unused imports/vars fail (TS6133/TS2322). The `eval` warning during vite build is from third-party `lottie-web`, unrelated.
- Frontend base `http://localhost:3000`, backend `http://localhost:8000`. Auth: `tester@local.dev` / `Test1234!`; owner `manish1@test.com` / `manish123`.
- Currency rendering: backend `_money` uses `CURRENCY_SYMBOLS`; Gulf/Middle East (AED/SAR/QAR/KWD/BHD/OMR/JOD/LBP) fall back to ISO code. Frontend `lib/currencies.ts` drives Currency `<select>`.
- Preview = HTML render + browser print; iframe `contentEditable`; "Save document changes" persists edited HTML; structured PATCH sets `html=None`.
- **Tax fix**: empty tax input sends `0`; `0`/empty renders as **"As applicable"** in preview + totals panel. Frontend `form.tax_pct` is `number | ''`; initial `data.tax_pct ? data.tax_pct : ''`.
- Quotation `version` increments on every save; `quotation_versions` table snapshots each version (data JSON + rendered html, editor, timestamp). `_safe_record_version` (try/except, rollback, warn log) ensures snapshot failure never breaks save.
- **Templates reference HTMLs (extracted content used for templates):** `/home/many-wallnut/Desktop/sales-app/Commercial Proposal - AIVOA LIMS Enterprise Suite (1).html` (INR ₹2L one-time + ₹3L/yr), `/home/many-wallnut/Desktop/sales-app/global_qms_proposal.html` (USD $8500 + $12000/yr, up to 100 users), `/home/many-wallnut/Desktop/sales-app/qms_domestic_proposal.html` (INR ₹2L + ₹3L/yr, up to 50 users).

## Work State
### Completed
- Backend Quotation module: models/quotation.py, schemas/quotation.py, services/quotation_service.py (compute_totals, list/get/create/update[409]/delete/duplicate/render_html/save_document/reset_document, render_preview for live-form POST /render), api/v1/quotations.py (list, create, get, GET+POST /render, PATCH ?expected_version, duplicate, delete, /document, /document/reset, GET /versions, GET /versions/{version}, POST /versions/{version}/restore), models/quotation_version.py, router.py; database.py/main.py schema ensurer.
- Frontend: types/api.ts, lib/quotation.ts, lib/currencies.ts, pages/QuotationsPage.tsx (list + CreateQuotationModal w/ template picker), pages/QuotationDetailPage.tsx (editor, editable preview, Save/Reset, History+restore, RichTextEditor for intro/terms, Unit dropdown, live-preview POST), components/ui/RichTextEditor.tsx, App.tsx routes, Sidebar.tsx, AccountDetailPage.tsx QuotationsCard.
- Tax "As applicable" + version history + 500 fixes (Decimal snapshot; line_items dict bug) + preview notes + Unit dropdown + preview redesign + rich text + two-way sync. **Verified end-to-end.**
- **Editable templates (NEW)**: `lib/quotationTemplates.ts` with Custom / LIMS / Global QMS / Domestic QMS (each has title, currency, tax_pct, intro HTML, terms HTML, notes HTML, line_items [one-time + recurring]). CreateQuotationModal in QuotationsPage.tsx now has a Template `<select>`; non-custom selections pre-fill the draft, Custom shows a currency dropdown and stays blank (keeps current model). Typecheck + vite build pass; frontend container rebuilt.

### Active
- (none)

### Blocked
- (none)

## Next Move
- Optional follow-ups (not requested): store a `template` column on Quotation to show a badge; or build per-template visual renderers (different HTML layouts) instead of content presets. Current implementation uses one generic renderer with content presets.

## Relevant Files
- `frontend/src/lib/quotationTemplates.ts` — template registry (Custom/LIMS/Global QMS/Domestic QMS) with default fields.
- `frontend/src/pages/QuotationsPage.tsx` — CreateQuotationModal (Template selector + Custom currency).
- `frontend/src/pages/QuotationDetailPage.tsx` — editor/preview consuming template defaults.
- `backend/app/services/quotation_service.py` — render_html (generic renderer for all templates).
- Reference HTMLs listed under Important Details.
