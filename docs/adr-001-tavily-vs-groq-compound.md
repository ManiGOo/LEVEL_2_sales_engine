# ADR-001: Why We Use Tavily Direct Instead of Groq Compound Web Search

**Status:** Accepted
**Date:** 2026-08-08
**Context:** Choosing the web search architecture for structured B2B lead intelligence

> This is the same decision as `scrapper/docs/adr-001-tavily-vs-groq-compound-web-search.md`.
> See that file for the full rationale. Summary below.

---

## TL;DR

**We use Tavily Direct, not Groq Compound.** Groq's built-in web search is powered by Tavily under the hood, but Groq Compound replaces our carefully engineered search queries with "let the model decide what to search." That's the opposite of what structured lead intelligence needs.

## The Core Difference

- **Tavily Direct** — We craft precise queries (`"Saintlife Pharmaceuticals" "QA manager" linkedin`), Tavily executes them, we get full content + structured results.
- **Groq Compound** — We ask a question, the model decides what to search. Opaque, non-deterministic, returns snippets only.

## Why Tavily Direct Wins

1. **Query precision** — We need exact searches, not model discretion
2. **Full content** — `/extract` gives page content for relevance classification (Compound gives snippets)
3. **Repeatability** — Same queries → same coverage every time
4. **Debugging** — We see exact queries and results, can tune thresholds
5. **Cost** — Pay only for search + LLM, not for code execution/browser tools we don't use
6. **Tavily features** — Domain filtering, date ranges, PII protection, `/crawl`, `/map`

## When Groq Compound Makes Sense

Only for the **chat assistant** where users ask open-ended questions. Even then, keep Tavily Direct for the lead research pipeline.
