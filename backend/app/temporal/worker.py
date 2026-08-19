"""Sales-app Temporal worker for lead research.

Runs the lead-research workflow entirely inside the sales-app (no dependency on
the scraper's `enricher` worker). Activities write results into the shared
Pharma DB (`company_leads` / `company_phones` in the `sdr_data` schema).
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor

from temporalio.client import Client
from temporalio.worker import Worker

from app.config import get_settings
from app.temporal.lead_research import (
    LeadResearchWorkflow,
    search_company_profile_activity,
    search_decision_makers_activity,
    search_intent_signals_activity,
    extract_people_activity,
    evaluate_and_save_lead_activity,
    mark_lead_failed_activity,
    scrape_company_website_activity,
    search_corporate_registry_activity,
)


async def main():
    settings = get_settings()
    client = await Client.connect(settings.temporal_host)
    worker = Worker(
        client,
        task_queue=settings.temporal_task_queue,
        workflows=[LeadResearchWorkflow],
        activities=[
            search_company_profile_activity,
            search_decision_makers_activity,
            search_intent_signals_activity,
            extract_people_activity,
            evaluate_and_save_lead_activity,
            mark_lead_failed_activity,
            scrape_company_website_activity,
            search_corporate_registry_activity,
        ],
        activity_executor=ThreadPoolExecutor(max_workers=20),
    )
    print(
        f"Starting sales-app LeadResearch Temporal Worker on "
        f"'{settings.temporal_task_queue}' (Temporal: {settings.temporal_host})..."
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
