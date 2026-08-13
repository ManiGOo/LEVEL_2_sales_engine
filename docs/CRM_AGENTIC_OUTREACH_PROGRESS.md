# CRM and Agentic Outreach — Implementation Progress

This file records what has actually been implemented from [CRM_AGENTIC_OUTREACH_PLAN.md](./CRM_AGENTIC_OUTREACH_PLAN.md). It is the working handoff for future implementation turns.

## Completed in this slice

### Contact provenance and readiness

- Campaign leads now retain contact source, source URL, evidence, confidence, verification status, verification timestamp, outreach readiness, and do-not-contact state.
- The researched-lead picker carries individual contact LinkedIn URLs instead of only the company LinkedIn URL.
- The picker displays the contact source when research provides it.
- Campaign lead rows display “Verified from …” and link to the source when available.
- Existing campaign databases receive additive columns at application startup; the migration is idempotent.

### Campaign preflight context

Campaigns now store:

- Objective
- Target audience
- Offer/context
- Sender identity
- Approved channels
- Daily send limit
- Stop conditions
- Preflight completion state

The New Campaign form collects the objective, audience, offer/context, sender, approved channels, and stop conditions. Campaign detail pages show and edit these fields.

### Activation safety gate

The backend refuses to activate a campaign unless it has:

- Objective
- Target audience
- Offer/context
- Sender identity
- At least one approved channel
- Stop conditions
- At least one contact
- Contact readiness that is not missing, awaiting review, blocked, or do-not-contact

This is a safety gate only. No email or LinkedIn sending has been enabled.

### Normalized contacts and draft-only outreach

- Added a reusable `contacts` table and linked campaign leads to a normalized contact record.
- Re-adding the same company/contact updates the shared contact record instead of creating a separate identity record.
- Added `outreach_messages` for channel-specific drafts with `draft`, `approved`, and `rejected` states.
- Added draft-only email and LinkedIn message actions in campaign detail.
- Drafts include campaign context and contact evidence, and can be explicitly approved or rejected.
- Draft approvals record the reviewing user, timestamp, status, and an activity-log event.
- There is intentionally no send endpoint or provider integration yet.

## Validation completed

- Frontend TypeScript/Vite production build passes.
- Backend Python syntax compilation passes.

## Not implemented yet

- ContactVerification history table (the current contact record stores the latest state)
- Contact deduplication across campaigns
- OAuth email integrations
- Email sending, delivery, bounce, and reply sync
- LinkedIn manual handoff state tracking
- Sequence and sequence-step models
- Temporal campaign outreach workflow
- MCP outreach tools
- Formal ApprovalRequest entity (message approval and activity audit are present in this slice)
- Consent, suppression, unsubscribe, and domain-limit enforcement
- CRM dashboards and reporting

## Next implementation order

1. Add ContactVerification history and explicit contact-review audit events.
2. Add a campaign preflight checklist with explicit per-contact review state.
3. Add human approval records and audit trail.
5. Add OAuth email account connection and email drafts.
6. Add Temporal scheduling for approved drafts only.
7. Add reply/bounce/opt-out synchronization and stop conditions.
8. Add LinkedIn manual handoff tracking.
9. Add narrowly scoped MCP tools.
10. Add CRM funnel and activity dashboards.

## Non-negotiable operating rule

The agent may research, verify, summarize, recommend, draft, and propose scheduling. It may not send email or perform LinkedIn outreach until contact information, source, campaign context, channel approval, message review, human approval, and compliance checks are all complete.
