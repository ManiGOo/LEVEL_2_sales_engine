"""Local read access to the scraper's already-scraped data.

Exposes sync query functions (``queries``), the local chat tool catalog
(``tools``) and the ORM models (``models``) for the ``sdr_data`` schema of the
shared Pharma database. This replaces the network calls the sales-app used to
make to the scraper's API/MCP server.
"""
