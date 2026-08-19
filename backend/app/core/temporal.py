"""Temporal client for the sales-app.

The sales-app connects directly to the shared Temporal server to start
lead-research workflows (the scraper's worker executes them and writes results
back into the shared ``sdr_data`` schema). This replaces the old HTTP trigger to
the scraper's API.
"""
from temporalio.client import Client

from app.config import get_settings

settings = get_settings()


async def get_temporal_client() -> Client:
    return await Client.connect(settings.temporal_host)
