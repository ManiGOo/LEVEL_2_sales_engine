# Implementation Plan — Campaign / Lead Stage Event Store + Timeline UI

## 1. Current state (already built)

| Requirement | Status | Where |
|---|---|---|
| Event-based stage store | ✅ Mostly | `CampaignActivity` model (`entity_type`, `from_state`, `to_state`, `snapshot` JSON) |
| Snapshots on status change | ✅ | `campaign_service.py` logs snapshots on campaign + lead transitions |
| Forward-only state machine (no going back) | ✅ | `CAMPAIGN_TRANSITIONS` / `LEAD_TRANSITIONS` raise on backward moves; frontend only offers next states |
| Confirm dialog (Continue/Reject) for stage moves | ✅ | `ConfirmationDialog` in `StateHistory.tsx` |
| Auto-activate campaign when a lead is contacted | ✅ | `update_lead` in `campaign_service.py` (draft → active + logged) |
| Lead save fields (Email, Phone, Next follow-up, Clear, Notes, Emailed, What happened…, Log, Save) | ✅ | `LeadRow` in `CampaignDetailPage.tsx` |
| Clickable previous-states | ✅ | `StateHistory` chips open a snapshot modal |

## 2. Gaps to implement

1. **Draft/context data isn't snapshotted.** Campaign preflight/context edits only log `updated` without `entity_type`/`snapshot`. Draft data must be stored per stage.
2. **Timeline isn't a graphical line diagram.** Current `StateHistory` is a plain chip row with chevrons — needs connected nodes + line, color-coded per state, used for campaign, lead, and team activity.
3. **`window.confirm` used for destructive actions** (delete campaign, remove lead) instead of the Continue/Reject `ConfirmationDialog`.
4. **Lead form isn't refreshed on new stage** — "What happened…" and log action should reset when a lead enters the next stage so each stage records fresh data.

## 3. Backend changes

**File:** `backend/app/services/campaign_service.py`

- In `update_campaign`: when any draft/context field changes, write an `updated` activity with `entity_type="campaign"`, `to_state=campaign.status`, and `snapshot=_campaign_snapshot(campaign)`. This stores all draft data as an immutable stage record.
- No model/schema changes needed — event store columns already exist.

## 4. Frontend changes

### A. `components/campaign/StateHistory.tsx` — graphical timeline (rewrite)

- Render events chronological (oldest → newest) as a connected line diagram:
  - Horizontal, scrollable; each stage = a dot node + connector line + label + date.
  - Dot color coded by state (draft=slate, active=emerald, completed=sky, archived=slate-600, contacted=amber, replied=emerald, not_interested=red, closed=indigo, status_change=purple, etc.).
  - Node is a button → opens the snapshot modal (stays clickable).
- Modal: friendly key-value rendering of `snapshot` (name, status, email, phone, next follow-up, notes, channels, etc.) instead of raw JSON dump, plus actor + timestamp + from→to badge.
- Works for `campaign` / `lead` / `team_activity` entity types unchanged (all three call sites keep working).

### B. `pages/CampaignDetailPage.tsx`

- Campaign delete: add `pendingDelete` state; replace `window.confirm` with `ConfirmationDialog` (Continue/Reject).
- LeadRow remove: add `pendingRemove` state; replace `window.confirm` with `ConfirmationDialog`.
- On lead stage move (Confirm Continue): reset `logAction` → `emailed` and clear `logDetail` so the new stage starts fresh; the form fields re-sync from the new lead data via the existing `useEffect` on `lead.updated_at`.

## 5. Verification

- Backend: import check (`python -c "import app.main"` style), then `docker compose build backend && docker compose up -d backend`.
- Frontend: `npx tsc -b`, then `docker compose build frontend && docker compose up -d frontend`.
- Manual: create campaign → edit preflight → confirm snapshot appears in timeline → move campaign active/completed/archived → verify backward moves rejected → contact a lead → confirm campaign auto-activates + dialog → delete/remove via Continue/Reject dialog.

## 6. Out of scope (unless you want it)

- Cross-team/global activity feed page (timeline is per-campaign).
- Approval workflow by a second user (current confirm is in-app, same user).
- Rollback/reopen of completed stages (explicitly disallowed per requirement).
