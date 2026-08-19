"""Sales-app Temporal integration.

Ports the lead-research workflow + activities so the sales-app runs its own
Temporal worker (`app.temporal.worker`) that executes `LeadResearchWorkflow`
and writes results into the shared Pharma DB.

- `lead_research.py` — `LeadResearchWorkflow` + its activities (ported from the
  scraper, with imports repointed at `app.scraper.*`).
- `cognitive_engine.py` — Groq client/helpers used by the activities.
- `worker.py` — entry point that starts the Temporal worker.
"""
