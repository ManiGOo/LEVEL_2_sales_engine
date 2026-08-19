"""Local reimplementation of the scraper's MCP query tools.

The chat agent used to call the scraper's MCP server over the network. Those
tools only read the already-scraped data, so we reimplement them directly
against the shared database. ``list_tools`` returns the same tool catalog the
agent expects; ``call_tool`` dispatches to the local query functions.
"""
from app.scraper import queries
from app.scraper.paper import assess_paper_category


TOOLS = [
    {
        "name": "query_signals",
        "description": (
            "Query regulatory signals with filters. Returns paginated results. "
            "Args: min_score (min score), year (filter by year), page, page_size "
            "(max 200), q (text search across drug/manufacturer/batch/reason), "
            "event_type ('NSQ_DRUG' or 'SPURIOUS_DRUG'), is_paper (paper-QMS flag), "
            "paper_class ('explicit'|'deductive'|'none'), group_by ('company' to "
            "collapse repeated incidents), rule_96, sub_rule_7, schedule_h2 "
            "(boolean mandate filters), schedule_m_gap (label)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "min_score": {"type": "integer"},
                "year": {"type": "integer"},
                "page": {"type": "integer"},
                "page_size": {"type": "integer"},
                "q": {"type": "string"},
                "event_type": {"type": "string"},
                "is_paper": {"type": "boolean"},
                "paper_class": {"type": "string"},
                "group_by": {"type": "string"},
                "rule_96": {"type": "boolean"},
                "sub_rule_7": {"type": "boolean"},
                "schedule_h2": {"type": "boolean"},
                "schedule_m_gap": {"type": "string"},
            },
        },
    },
    {
        "name": "get_company_count",
        "description": "Count of unique company entities in the database.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_company_ranking",
        "description": (
            "Company leaderboard ranked by highest-scoring signal. Args: page, "
            "page_size, q (search filter across company names and related fields)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "page": {"type": "integer"},
                "page_size": {"type": "integer"},
                "q": {"type": "string"},
            },
        },
    },
    {
        "name": "get_company_signals",
        "description": (
            "Full company detail page: summary stats + all grouped event cards. "
            "Args: slug (URL-safe company slug e.g. 'rivpra-formulation')."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"slug": {"type": "string"}},
        },
    },
    {
        "name": "get_web_evidence",
        "description": "Retrieve stored web evidence for a regulatory record. Args: event_id (UUID).",
        "inputSchema": {
            "type": "object",
            "properties": {"event_id": {"type": "string"}},
        },
    },
    {
        "name": "get_lead",
        "description": (
            "Retrieve researched lead data for a company: decision makers, "
            "contacts, hiring, activity signals, QMS triggers, website and status. "
            "Args: company_name (company name or key)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"company_name": {"type": "string"}},
        },
    },
    {
        "name": "get_company_phones",
        "description": (
            "Retrieve phone numbers scraped from a company's own website, each "
            "labelled with what it's for. Args: company_name (company name or key)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"company_name": {"type": "string"}},
        },
    },
    {
        "name": "assess_paper_category",
        "description": (
            "Classify a company/event as explicit (Category 1), deductive "
            "(Category 2) or none paper-QMS evidence. Args: company_key, reason, "
            "reported_by, llm_failure_mode (optional)."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "company_key": {"type": "string"},
                "reason": {"type": "string"},
                "reported_by": {"type": "string"},
                "llm_failure_mode": {"type": "string"},
            },
        },
    },
]


_DISPATCH = {
    "query_signals": queries.query_signals,
    "get_company_count": queries.get_company_count,
    "get_company_ranking": queries.get_company_ranking,
    "get_company_signals": queries.get_company_signals,
    "get_web_evidence": queries.get_web_evidence,
    "get_lead": queries.get_lead,
    "get_company_phones": queries.get_company_phones,
    "assess_paper_category": lambda company_key="", reason="", reported_by="",
                          llm_failure_mode="": assess_paper_category(
        company_key, reason, reported_by, [], [], llm_failure_mode),
}


def list_tools() -> list[dict]:
    return [
        {"name": t["name"], "description": t["description"], "inputSchema": t["inputSchema"]}
        for t in TOOLS
    ]


def call_tool(name: str, arguments: dict) -> dict:
    """Dispatch a tool call locally. Returns a JSON-serializable dict (matching
    the JSON the scraper's MCP server used to return)."""
    fn = _DISPATCH.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(**(arguments or {}))
    except TypeError as e:
        return {"error": f"Invalid arguments for {name}: {e}"}
