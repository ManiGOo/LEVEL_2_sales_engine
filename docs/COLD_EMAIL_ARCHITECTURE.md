# Cold Email Outreach Architecture — Sales App + Cold Email Microservice

**Status:** Working document (draft — target architecture not yet built)
**Scope:** How the sales app performs safe, compliance-gated cold email outreach
to **B2B sales prospects**, delivered as a **separate microservice/application**
that the sales app connects to, sending through **Twilio SendGrid**. Documents
what exists today and what is planned.

---

## 1. Purpose and design decision

The sales app finds company signals (via the scrapper stack), researches contacts
with provenance, runs campaigns through a human-approval pipeline, and will send
cold email at scale (target ~500/day) to sales prospects. The sending engine is
built **in-house as a standalone application — the Cold Email Service** — not
embedded in the sales app backend, and not an all-in-one email platform (no
Smartlead, Mailshake, etc.).

### Sending provider: Twilio SendGrid

Sending is done through **Twilio SendGrid's REST API** with verified secondary
domains and (recommended) a dedicated IP. No Gmail/Workspace or Microsoft 365
inboxes are used for sending — SendGrid is the sole outbound channel.

- **Why SendGrid**: purpose-built transactional/bulk email API, per-email delivery
  events, suppression groups, Inbound Parse for replies, and IP warm-up tooling.
- **No inboxes needed**: SendGrid sends from a sender identity + verified domain
  over the API; deliverability is managed per domain/IP, not per mailbox.
- **Rotation still applies**: our `rotation_engine` rotates across verified
  domains and sender identities and enforces per-domain daily caps, because
  SendGrid does not do cold-email rotation for you.

### Why a separate microservice

- **Operational isolation** — if sending gets flagged or the provider throttles us,
  the CRM app and research pipeline keep working untouched.
- **Security boundary** — the `SENDGRID_API_KEY` and suppression data never live
  in the CRM app.
- **Independent scaling** — send workers (Temporal) scale separately from the
  CRM API.
- **Cleaner compliance** — the CRM only *approves and hands off*; the service only
  *sends and syncs*. No unrestricted send endpoint ever exists in the CRM app.
- **Reusability** — the service is a reusable outbound-email engine for future
  clients, not just this sales app.

External dependencies are limited to:

| Dependency | Role | Status |
|---|---|---|
| Twilio SendGrid | Email sending, delivery events, replies, suppression | Planned (sole sender) |
| Groq | LLM for chat + agent drafting | In use (sales app) |
| Tavily | Web research (lead/contact discovery, evidence) | In use (sales app) |
| Sentinel (own scrapper stack) | Signal pipeline, enrichment, Temporal workflows | In use |
| Secondary domains + DNS | Sending infrastructure (SPF/DKIM/DMARC) | Planned |
| DeBounce (optional) | Real-time email validity verification | Optional |

### Updated operating rule

Recipients are **B2B sales prospects**. Outreach is standard sales cold email.
The rule remains: the agent may research, verify, draft, recommend, and propose
scheduling — but **only human-approved messages are handed off to the Cold Email
Service**, and the service sends only via SendGrid, never from the CRM app.

---

## 2. What We Have (current sales app architecture)

### 2.1 Stack

```
┌─────────────┐   HTTP    ┌───────────────────────┐
│  React/Vite │ ────────▶ │  FastAPI backend      │
│  Tailwind   │           │  (app/backend) :8000  │
│  :3000      │ ◀──────── │                       │
└─────────────┘   JSON    └───────────┬───────────┘
                                      │
              ┌───────────────┬────────┴────────┬──────────────┐
              ▼               ▼                 ▼              ▼
        ┌──────────┐   ┌───────────┐   ┌────────────┐   ┌────────────┐
        │ Postgres │   │  ChromaDB │   │  Groq API  │   │ Tavily API │
        │   :5434  │   │  :8100    │   │            │   │            │
        └──────────┘   └───────────┘   └────────────┘   └────────────┘
                                      ┌──────────────────────────────┐
                        ┌────────────▶│  Sentinel scrapper stack     │
                        │             │  - FastAPI (app) :5000       │
                        │             │  - Temporal (workflows)      │
                        │             │  - workers / enricher       │
                        └─────────────│  - MCP endpoint             │
                                      └──────────────────────────────┘
```

- **Backend**: FastAPI + SQLAlchemy async + Postgres. Env-config via
  `backend/app/config.py` (`GROQ_API_KEY`, `SENTINEL_MCP_URL`, `SENTINEL_API_URL`,
  Chroma, JWT).
- **Frontend**: React + Vite + Tailwind, TypeScript. Campaign UI in
  `frontend/src/pages/CampaignDetailPage.tsx`.
- **Sentinel integration**: thin proxy in `sentinel_service.py` (signals,
  companies, web evidence, enrichment, lead research, campaign start).

### 2.2 Domain model (backend/app/models/campaign.py)

| Model | Fields (relevant) | Notes |
|---|---|---|
| `Campaign` | `status`, `objective`, `target_audience`, `offer_context`, `sender_identity`, `approved_channels`, `daily_send_limit`, `stop_conditions`, `preflight_complete` | draft → active → completed → archived |
| `Contact` | identity, role, email/phone/LinkedIn, `source`, `source_url`, `evidence`, `confidence`, `verification_status`, `outreach_readiness`, `do_not_contact`, `verified_at` | normalized, deduped by company_key + name |
| `CampaignLead` | company + contact fields, `status`, `last_contact_at`, `next_follow_up_at`, `notes`, links to `Contact` | queued → contacted → replied/not_interested → closed |
| `CampaignActivity` | immutable event store: `action`, `entity_type`, `from_state`, `to_state`, `snapshot` JSON, actor, timestamp | stage history + snapshots per transition |
| `OutreachMessage` | `channel` (email/linkedin), `status` (draft/approved/rejected), `subject`, `body`, `generated_by`, `approved_by`, `approved_at` | draft-only, no send path |

### 2.3 State machines (campaign_service.py)

- **Campaign**: `draft → active → completed → archived` (forward only).
- **Lead**: `queued → contacted → replied | not_interested → closed`.
- **Message**: `draft → approved | rejected` (approve/reject via
  `POST /campaigns/{id}/messages/{mid}/review`).

### 2.4 Activation safety gate (`_preflight_missing`)

A campaign cannot go `active` without: objective, target audience, offer context,
sender identity, ≥1 approved channel, stop conditions, ≥1 contact, and no blocked /
unready / do-not-contact leads. Activating marks `preflight_complete = True`.
Contacting a lead on a draft campaign auto-activates it.

### 2.5 Draft-only outreach

- `create_draft` (`POST /campaigns/{id}/leads/{lid}/drafts?channel=email|linkedin`)
  generates a personalized draft from campaign context + contact evidence
  (`_draft_body`), gated on readiness and do-not-contact.
- Drafts are reviewed (`approved`/`rejected`) by a human. **There is no send
  endpoint.** No SendGrid, no SMTP, no provider sync yet.

---

## 3. Target architecture — two applications

### 3.1 Components

| App | Responsibility |
|---|---|
| **Sales app** (this repo) | CRM: campaigns, contacts, leads, drafting, human approval, dashboards. **Never sends.** |
| **Cold Email Service** (new repo/app) | Outbound engine: SendGrid integration, verified domains, rotation, sequences, scheduling, sending, reply/bounce/unsubscribe sync, suppression, unified inbox. **Only sends approved handoffs.** |
| **Twilio SendGrid** | Email delivery, delivery/bounce/spam events, Inbound Parse (replies), suppression groups. |
| **Sentinel stack** | Signal pipeline + Temporal workflows (shared orchestration runtime). |

### 3.2 Topology

```
                       ┌────────────────────────────────────────────┐
                       │           COLD EMAIL SERVICE               │
                       │  FastAPI (:8101) + own Postgres (:5435)    │
                       │  Temporal workers (schedule/send/sync)     │
                       │                                            │
                       │  VerifiedDomain / SenderIdentity /         │
                       │  Sequence / Outbox / Suppression models    │
                       │  RotationEngine   ◀── per-domain caps      │
                       │  ComplianceLimits ◀── daily/delay/window   │
                       │  EventSync  ──▶ webhooks to sales app      │
                       └───────┬────────────┬────────────┬──────────┘
                               │            │            │
              SENDGRID_API_KEY │            │            │ SendGrid Event Webhook
                + SendGrid API │            │            │ + Inbound Parse (replies)
                               ▼            ▼            │
                       ┌────────────────────────────┐    │
                       │   TWILIO SENDGRID          │    ▼
                       │   - verified domains       │
                       │   - dedicated IP (warm-up) │
                       │   - delivery/bounce events │
                       │   - Inbound Parse replies  │
                       └────────────────────────────┘

┌───────────────────────────────────────────────┐         │
│ SALES APP                                     │         │
│  Campaign engine: preflight → draft → approve │         │
│  POST /cold-email/... (approved handoff)  ────┼─────────┤
│  GET  /cold-email/inbox (unified inbox)  ◀────┼─────────┤
│  POST /cold-email/webhooks (status sync)  ◀───┼─────────┤
└───────────────────────────────────────────────┘         │
```

The two apps talk only over HTTP. **No shared database, no shared code.**
Cross-references are external IDs (the sales app's message UUID is the join key).

### 3.3 What the Cold Email Service owns

| Area | Component | Detail |
|---|---|---|
| Provider | `SendGridClient` | REST API wrapper (send, events, inbound, suppression); reads `SENDGRID_API_KEY` |
| Domains | `VerifiedDomain` | secondary domains verified in SendGrid: SPF/DKIM/DMARC status, per-domain daily caps, IP assignment, warm-up state |
| Sender identities | `SenderIdentity` | from-name/from-email per domain (e.g. `sales@try-{brand}.com`, `hello@try-{brand}.com`); rotation pool |
| Sequencing | `Sequence`, `SequenceStep` | channel, delay, template, personalization fields, retry policy, stop conditions (Day 0 email → Day 3 LinkedIn → Day 7 follow-up) |
| Outbox | `OutboundMessage` | lifecycle: `received → scheduled → sending → sent → delivered → bounced → replied → failed → cancelled`; SendGrid message ID + `group_id` |
| Rotation | `rotation_engine` | in-house equivalent of inbox rotation: cycles verified domains + sender identities evenly, honors per-domain daily caps, randomized human-like delay (180–320s) |
| Scheduling | Temporal `CampaignWorkflow` | durable: schedule → send → wait → follow-up → stop on reply/opt-out/bounce |
| Sync | `EventSync` | consumes SendGrid Event Webhook (delivered/bounce/drop/spamreport/unsubscribe) + Inbound Parse (replies); pushes status to the sales app |
| Verification | DeBounce integration (optional) | real-time email validity check at handoff time |
| Compliance | `suppression_engine` | opt-out, unsubscribe, bounce, do-not-contact, email + domain suppression, daily caps, timezone send windows; mirrors into SendGrid suppression groups |
| Inbox | unified inbox API | aggregates Inbound Parse replies; sales app renders them |

### 3.4 Message lifecycle (target)

```
sales-app approved message
   └─▶ POST /outbound          (received)
        └─▶ scheduled → sending → sent → delivered
                    │            ↓          ↓
                 failed       bounced / dropped
                                 │
        reply (Inbound Parse) ──► webhook → sales app lead: replied/closed
        unsubscribe / spam ─────► SendGrid suppression group + webhook
```

No agent-created draft sends automatically. Only a sales-app-approved message is
handed off; the rotation engine picks the next verified domain + sender identity,
respects limits and delays, and sends over the SendGrid API.

### 3.5 Per-campaign configuration (handed off with each approved message)

Extends the sales app's existing `Campaign` fields (`daily_send_limit`,
`approved_channels`, `stop_conditions`):

- selected sender identities/domains or "auto-rotate"
- per-domain daily caps
- send window + timezone (no sends outside it)
- randomization range for inter-send delay
- follow-up sequence reference
- stop conditions: reply | meeting booked | not interested | unsubscribe |
  bounce | do-not-contact | manual pause | campaign complete
- SendGrid suppression group id (unsubscribe/opt-out)

---

## 4. Integration contract (sales app ↔ Cold Email Service)

### 4.1 Sales app → Cold Email Service (HTTP)

```text
POST /v1/outbound                    hand off an approved message
     { message_id, campaign_id, lead_id, contact_email,
       subject, body,
       sender_identities: [ids] | "auto-rotate",
       schedule_at?, sequence: {steps}, limits, window,
       stop_conditions, suppression_group_id, metadata }
     → 202 { outbound_id, status: "received" }

POST /v1/outbound/{id}/cancel        cancel a scheduled send
GET  /v1/outbound/{id}               status: scheduled|sent|delivered|bounced|replied|failed
GET  /v1/outbound?campaign_id=       batch status

POST /v1/domains                     register + verify a secondary domain in SendGrid
POST /v1/sender-identities           create a sender identity
GET  /v1/accounts                    list verified domains + identities + health (quota, IP warm-up)
PATCH /v1/domains/{id}               per-domain limits, enable/disable

GET  /v1/inbox                       unified inbox (SendGrid Inbound Parse replies)
POST /v1/leads/{id}/verify-email     DeBounce check (optional)
```

### 4.2 Cold Email Service → Sales App (webhooks)

```text
POST /cold-email/webhooks            (endpoint in the sales app)
  event: message_sent | message_delivered | message_bounced |
         message_failed | reply_received | unsubscribe | spam_report
  payload: { outbound_id, message_id, lead_id, sendgrid_message_id,
             reply_body?, contact_email, error?, event_detail }
```

The sales app maps webhooks to `OutreachMessage.status` (add
`sent/delivered/bounced/replied/failed`) and to `CampaignLead` transitions
(reply → `replied`/`closed`).

### 4.3 Provider-side (owned by the service)

```text
POST /v1/sendgrid/events              SendGrid Event Webhook (delivered, bounce,
                                      deferred, drop, open, click, spamreport,
                                      unsubscribe, group_unsubscribe)
POST /v1/sendgrid/inbound             SendGrid Inbound Parse (replies + opt-out text)
SendGrid REST API                     send, suppression groups, domain verification
```

---

## 5. Data ownership split

| Data | Lives in |
|---|---|
| Campaign, Contact, CampaignLead, CampaignActivity, OutreachMessage (draft/approved/rejected), ApprovalRequest | Sales app DB |
| VerifiedDomain, SenderIdentity, Sequence/SequenceStep, OutboundMessage (outbox), SuppressionList, WarmupState | Cold Email Service DB |
| `SENDGRID_API_KEY` + provider message IDs | Cold Email Service DB / env only (encrypted) |

Cross-entity references use external IDs (`message_id`, `lead_id`, `campaign_id`)
passed in the HTTP contract — no foreign keys across services.

---

## 6. Compliance and safety rules (target)

Recipients are **B2B sales prospects**; outreach is sales cold email.

- **Human approval required**: first campaign launch, new sender domain/identity,
  new sequence, new contact batch, all LinkedIn actions, sensitive/legal/regulatory
  claims.
- **Auto-stop**: reply | meeting booked | not interested | unsubscribe | bounce |
  spam report | do-not-contact | manual pause | campaign complete.
- **Limits**: daily and per-domain caps (self-imposed ~500/day); randomized
  human-like delay; timezone-aware send windows.
- **Suppression**: opt-outs, unsubscribe links, email + domain suppression,
  duplicate prevention, bounce suppression. Mirrored into SendGrid suppression
  groups so SendGrid itself stops honoring requests.
- **SendGrid deliverability**: secondary domains only (never the primary domain),
  SPF/DKIM/DMARC verified per domain, dedicated IP warmed up 14–21+ days before
  real sends.
- **No unrestricted send endpoint anywhere**; the sales app can only hand off
  human-approved messages.

---

## 7. Deployment topology (target)

| Service | Stack | Ports | Notes |
|---|---|---|---|
| Cold Email Service | FastAPI + Postgres + Temporal workers | API :8101, DB :5435 | own Docker Compose; separate network, open only to sales-app backend |
| Sales app | unchanged | :3000 / :8000 | adds `COLD_EMAIL_URL` + `COLD_EMAIL_API_KEY` |
| Twilio SendGrid | external | HTTPS API | `SENDGRID_API_KEY` stored in the service only |
| Sentinel | unchanged | :5000 | Temporal shared with the service's workers |

Security: the service exposes no public UI; the sales app backend calls it with an
API key; SendGrid Event Webhook / Inbound Parse are signature-verified
(`X-Twilio-Email-Event-Webhook-Signature`).

---

## 8. What We Have → What We Want (mapping)

| Capability | Have today (sales app) | Add (Cold Email Service) |
|---|---|---|
| Contact data + provenance | ✅ Contact/CampaignLead + source/evidence/confidence | ContactVerification history (sales app) |
| Verification states | ✅ `verification_status` / `outreach_readiness` | DeBounce live validity at handoff (service) |
| Preflight gate | ✅ activation gate + checklist | per-contact review state (sales app) |
| Drafting | ✅ `create_draft` + `_draft_body` | agent drafts via Groq with stricter provenance (sales app) |
| Human approval | ✅ approve/reject + `approved_by/at` | formal `ApprovalRequest` + audit (sales app) |
| Handoff | ❌ none | `POST /outbound` + webhook receiver (both) |
| Sending | ❌ none | SendGrid API client, verified domains, send path (service) |
| Sequences | ❌ none | `Sequence`/`SequenceStep` (service) |
| Scheduling | ❌ none | Temporal `CampaignWorkflow` (service) |
| Rotation | ❌ none | `rotation_engine` across domains + identities (service) |
| Reply/bounce sync | ❌ none | SendGrid Event Webhook + Inbound Parse → status push (service) |
| Unsubscribe/opt-out | partial (`do_not_contact`) | suppression lists + SendGrid suppression groups (service) |
| Unified inbox | ❌ none | `/inbox` API → sales app UI |
| Reporting | ❌ none | funnel + send/reply/bounce dashboards (sales app) |
| MCP tools | ❌ none | narrowly scoped outreach tools (service) |

---

## 9. Rollout order

1. Scaffold Cold Email Service app (FastAPI, own DB, API-key auth, `SendGridClient`
   stubbed; `VerifiedDomain`/`SenderIdentity`/`OutboundMessage` models).
2. SendGrid account setup: verify secondary domains (SPF/DKIM/DMARC), create
   sender identities, request/assign dedicated IP, start IP warm-up.
3. DeBounce email verification on handoff.
4. `POST /outbound` + minimal send path (approved handoff → SendGrid API, single
   identity, no rotation yet) and sales-app webhook receiver.
5. `Sequence`/`SequenceStep` + per-step approval.
6. `rotation_engine`: per-domain caps, randomized delay, identity/domain assignment.
7. Temporal `CampaignWorkflow` for schedule/send/follow-up.
8. Event Webhook + Inbound Parse sync and `suppression_engine` (+ suppression groups).
9. Unified inbox API + sales-app inbox UI.
10. LinkedIn manual handoff tracking; dashboards; MCP tools.

---

## 10. External infrastructure checklist (not code)

- Buy 5 secondary domains (e.g. `try-{brand}.com`, `get-{brand}.com`) — sending
  never comes from the primary domain.
- Twilio SendGrid account (paid plan for cold email volume; free tier caps at
  100/day).
- For each domain, add DNS records:
  - **SPF**: include SendGrid — `v=spf1 include:sendgrid.net ~all` (merge with any
    existing SPF; only one SPF record allowed per domain).
  - **DKIM**: publish the two CNAME records SendGrid generates
    (e.g. `s1._domainkey` → `s1.domainkey.u1234567.wl.sendgrid.net`).
  - **DMARC**: `v=DMARC1; p=none; rua=mailto:dmarc@{brand}.com` — start in monitor
    mode, tighten to `p=quarantine` later.
- For replies/unified inbox: set the Inbound Parse MX record (e.g. `inbound` →
  `mx.sendgrid.net`) and point Inbound Parse webhook at the service.
- Dedicated IP warm-up 14–21+ days before the first real send (SendGrid's IP
  warm-up tooling).

---

## 11. Open decisions

- Where does the Cold Email Service repo live (sibling of this repo, e.g.
  `~/Desktop/cold-email-service`)? Same Temporal as Sentinel, or its own workers?
- How many secondary domains for the rotation pool at launch (5 domains =
  ~100/day each = 500/day)?
- Dedicated IP (recommended) or shared IP for launch?
- Add **DeBounce** now, or start with in-house verification status only?
- Unified inbox served by the service (`/inbox` API) or n8n routing instead?
