import httpx
from app.config import get_settings

settings = get_settings()


async def get_signals(**params) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{settings.sentinel_api_url}/api/v1/signals/high-priority", params=params)
        resp.raise_for_status()
        return resp.json()


async def get_companies(page: int = 1, page_size: int = 10, q: str = None) -> dict:
    params = {"page": page, "page_size": page_size}
    if q:
        params["q"] = q
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{settings.sentinel_api_url}/api/v1/companies/ranking", params=params)
        resp.raise_for_status()
        return resp.json()


async def get_company_detail(slug: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{settings.sentinel_api_url}/api/v1/companies/{slug}/signals")
        resp.raise_for_status()
        return resp.json()


async def get_web_evidence(event_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{settings.sentinel_api_url}/api/v1/records/{event_id}/web-evidence")
        resp.raise_for_status()
        return resp.json()


async def trigger_web_evidence_search(event_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{settings.sentinel_api_url}/api/v1/web-evidence/search/{event_id}"
        )
        resp.raise_for_status()
        return resp.json()


async def get_enrichment_status(workflow_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{settings.sentinel_api_url}/api/v1/enrichment/status/{workflow_id}")
        resp.raise_for_status()
        return resp.json()


async def research_leads(company_keys: list) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.sentinel_api_url}/api/v1/leads/research",
            json={"company_keys": company_keys},
        )
        resp.raise_for_status()
        return resp.json()


async def get_lead_status() -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{settings.sentinel_api_url}/api/v1/leads/status")
        resp.raise_for_status()
        return resp.json()


async def get_lead_detail(company_key: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{settings.sentinel_api_url}/api/v1/leads/{company_key}")
        resp.raise_for_status()
        return resp.json()
