import httpx
from app.config import get_settings

settings = get_settings()


class MCPClient:
    """HTTP client for Sentinel's MCP Streamable HTTP server."""

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or settings.sentinel_mcp_url).rstrip("/")

    async def _send(self, method: str, params: dict = None) -> dict:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self.base_url,
                json=payload,
                headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"},
            )
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "text/event-stream" in content_type:
                return self._parse_sse(resp.text)
            return resp.json()

    def _parse_sse(self, text: str) -> dict:
        for line in text.strip().split("\n"):
            if line.startswith("data: "):
                import json
                return json.loads(line[6:])
        return {}

    async def list_tools(self) -> list[dict]:
        result = await self._send("tools/list")
        return result.get("result", {}).get("tools", [])

    async def call_tool(self, name: str, arguments: dict) -> dict:
        result = await self._send("tools/call", {"name": name, "arguments": arguments})
        return result.get("result", {})


mcp_client = MCPClient()
