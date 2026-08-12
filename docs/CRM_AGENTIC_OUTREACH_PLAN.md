# CRM and Agentic Outreach Implementation Plan

This plan is the implementation rule for the sales app's CRM and outreach automation.

## Operating rule

The agent may research, verify, summarize, recommend, draft, and schedule proposed actions. It may not send email or perform LinkedIn outreach until all of the following are true:

1. Contact information is present.
2. The contact source has been reviewed.
3. Campaign context is complete.
4. The channel is approved.
5. The message has been reviewed.
6. A human explicitly approves the action.
7. No stop or compliance rule is active.

## Phase 1: Establish the CRM data model

Create permanent entities instead of storing contact data only inside campaign leads.

- Company
- Contact
- ContactVerification
- Campaign
- CampaignContact
- Sequence
- SequenceStep
- Message
- Activity
- ConsentRecord
- IntegrationAccount
- AgentRun
- ApprovalRequest

Each contact must support name, role, company, email, phone, LinkedIn URL, confidence, verification status, verification source and URL, last verification time, owner, consent status, do-not-contact status, and notes. Migrate existing campaign-lead data into these records.

## Phase 2: Preserve research provenance

Every discovered contact must retain:

- Source type: corporate registry, company website, LinkedIn, web search, or user-entered
- Source URL
- Evidence snippet
- Verification timestamp
- Confidence
- Verification method

Display this information before a contact can enter outreach. For example: “Verified from Corporate registry”, with its source and last-checked date.

## Phase 3: Add contact verification and readiness

Verification states:

```text
unverified → needs_review → verified → stale | invalid | do_not_contact
```

Outreach readiness states:

```text
missing_contact_info | needs_user_review | ready_for_email |
ready_for_linkedin | ready_for_outreach | blocked
```

Rules:

- Registry evidence can verify identity, not necessarily an outreach channel.
- Email requires a verified email address.
- LinkedIn requires a verified individual profile.
- A contact with no approved channel cannot be automated.
- Stale data must be rechecked before sending.

## Phase 4: Improve campaign creation

Campaigns must capture objective, target audience, product/offer, relevant context, sender identity, approved channels, daily limit, follow-up policy, stop conditions, and assigned owner.

Required context:

```text
What are we offering?
Why is this company being contacted?
Why is this person relevant?
What evidence supports the outreach?
What action should the recipient take?
```

A campaign cannot activate without this context.

## Phase 5: Contact selection and preflight

The contact picker must show identity, role, email and LinkedIn availability, source evidence, confidence, outreach readiness, prior outreach, and opt-out status.

Require a preflight checklist:

```text
[ ] Contact identity reviewed
[ ] Contact source reviewed
[ ] Contact information verified
[ ] Campaign context completed
[ ] Sender account selected
[ ] Message channels approved
[ ] Daily limit configured
[ ] Stop conditions configured
[ ] Drafts reviewed
```

## Phase 6: Sequences

Create reusable sequences with channel, delay, template, personalization fields, approval requirement, retry policy, and stop conditions.

Initial channels:

- Email
- LinkedIn draft/manual handoff
- Manual call
- Manual note

Example:

```text
Day 0: Email introduction
Day 3: LinkedIn connection/message
Day 7: Email follow-up
Stop: reply, opt-out, bounce, or manual close
```

## Phase 7: Agent drafting

The agent may draft from company research, contact role, verified evidence, campaign objective, previous activity, and approved tone/claims.

Each draft includes subject, body, personalization evidence, source context, confidence, warnings, and a suggested next step. The agent must not invent contact details, company facts, regulatory claims, prior interactions, product capabilities, or personal relationships.

## Phase 8: Human approval

Message lifecycle:

```text
draft → reviewed → approved → scheduled → sent → delivered → replied
```

No agent-created draft sends automatically. Require explicit approval for a first campaign launch, a new sender account, a new sequence, a new contact batch, all LinkedIn actions, and sensitive/legal/regulatory claims.

## Phase 9: Email integration

Start with OAuth-based Gmail/Google Workspace and Outlook/Microsoft Graph integrations.

Required capabilities:

- Sender-account connection and identity selection
- Draft creation and approval
- Sending approved messages
- Provider message/thread IDs
- Delivery, bounce, and reply synchronization
- Unsubscribe handling
- Rate limits

Email states:

```text
draft | approved | scheduled | sending | sent | delivered | bounced |
replied | failed | cancelled
```

## Phase 10: LinkedIn workflow

Start with draft-and-handoff, not autonomous sending:

1. Verify profile.
2. Draft connection request or message.
3. User reviews and approves.
4. Open the verified LinkedIn profile.
5. User sends manually.
6. User marks it as sent.
7. Record the activity.

Track `profile_verified`, `drafted`, `approved`, `opened`, `sent_manually`, `replied`, and `not_interested`. Use an official LinkedIn integration only if it is legally and technically available.

## Phase 11: Temporal orchestration

Use Temporal for durable campaign workflows:

```text
CampaignWorkflow
  ├── validate_campaign_context
  ├── verify_contacts
  ├── generate_message_drafts
  ├── request_human_approval
  ├── schedule_sequence
  ├── send_approved_email
  ├── wait_for_reply_or_delay
  ├── propose_next_action
  └── stop_on_terminal_condition
```

Pause on incomplete data, missing approval, bounce, reply, opt-out, user pause, or safety-rule violation.

## Phase 12: MCP agent tools

Expose narrowly scoped tools.

Research: `get_company_research`, `get_contact_verification`, `refresh_contact_verification`, `get_contact_history`.

Drafting: `draft_email`, `draft_linkedin_message`, `preview_sequence`.

CRM: `create_contact`, `update_contact`, `add_contact_to_campaign`, `log_activity`, `schedule_follow_up`.

Approval: `request_message_approval`, `approve_message`, `reject_message`, `pause_campaign`, `resume_campaign`.

Restricted sending: `create_email_draft`, `send_approved_email`, `open_linkedin_profile`, `mark_linkedin_sent`. Do not expose an unrestricted sending tool.

## Phase 13: Permissions and audit trail

Record actor, human/agent identity, timestamp, contact, campaign, previous/new values, approval state, source, workflow ID, and provider/message ID.

- Admin: integrations, policies, approvals
- Manager: campaigns, approvals, reports
- Rep: assigned contacts and drafts
- Agent: research, verification, drafting, scheduling proposals only

## Phase 14: Compliance and safety

Implement opt-outs, do-not-contact lists, unsubscribe links, email/domain suppression, duplicate prevention, daily/hourly and per-domain limits, time-zone-aware send windows, bounce suppression, reply stop conditions, and human escalation for sensitive replies.

Automatic stops:

```text
reply | meeting booked | not interested | unsubscribe | bounce |
do-not-contact | manual pause | campaign complete
```

## Phase 15: CRM dashboards

Add views for contacts by verification state, contacts needing review, campaign funnel, messages awaiting approval, scheduled/sent messages, replies, bounces, meetings, follow-ups due, agent actions, failed workflows, and opt-outs.

Funnel:

```text
researched → verified → selected → drafted → approved → scheduled → contacted
→ replied → meeting → opportunity → closed
```

## Phase 16: Testing and rollout

Unit-test deduplication, provenance, verification/readiness rules, stop conditions, consent rules, personalization, and approval requirements.

Integration-test research-to-contact creation, enrollment, drafting, approval, Temporal scheduling, email send/reply sync, LinkedIn handoff, pause/resume, bounces, and unsubscribes.

Roll out in this order:

1. Provenance and contact model
2. Contact verification UI
3. Campaign preflight checklist
4. Draft-only email generation
5. Human approval workflow
6. Email integration
7. Temporal scheduling
8. Reply synchronization
9. LinkedIn draft/manual workflow
10. MCP tools
11. Reporting and optimization
