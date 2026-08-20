"""Local service layer for scraped regulatory data.

Replaces the old ``sentinel_service`` HTTP client: instead of calling the
scraper over the network, these functions query the shared database directly
through ``app.scraper.queries``.
"""
from typing import Optional

from app.scraper import queries


async def get_signals(**params) -> dict:
    # The scraper's signals endpoint defaults min_score to 0; the sales-app used
    # `page`/`page_size`/`q`/`year`/`event_type`/`group_by` as query params.
    return queries.query_signals(
        min_score=params.get("min_score", 0),
        year=params.get("year"),
        page=params.get("page", 1),
        page_size=params.get("page_size", 30),
        q=params.get("q"),
        event_type=params.get("event_type"),
        is_paper=params.get("is_paper"),
        paper_class=params.get("paper_class"),
        group_by=params.get("group_by"),
        rule_96=params.get("rule_96", False),
        sub_rule_7=params.get("sub_rule_7", False),
        schedule_h2=params.get("schedule_h2", False),
        schedule_m_gap=params.get("schedule_m_gap"),
    )


async def get_companies(
    page: int = 1,
    page_size: int = 10,
    q: str = None,
    year: int = None,
    state: str = None,
    min_score: int = None,
    max_score: int = None,
) -> dict:
    return queries.get_company_ranking(
        page=page, page_size=page_size, q=q,
        year=year, state=state, min_score=min_score, max_score=max_score,
    )


async def get_company_detail(slug: str) -> dict:
    return queries.get_company_signals(slug)


async def get_web_evidence(event_id: str) -> dict:
    return queries.get_web_evidence(event_id)


async def get_lead_detail(company_key: str) -> dict:
    # The Leads page passes a company name/key; the local query resolves it.
    return queries.get_lead(company_key)
