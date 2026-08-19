import json
import re
import httpx
from groq import AsyncGroq, BadRequestError
from app.config import get_settings
from app.scraper.tools import list_tools, call_tool
from app.services.memory_service import store_message, retrieve_context

settings = get_settings()

groq_client = AsyncGroq(api_key=settings.groq_api_key, timeout=60.0)

SYSTEM_PROMPT = """You are AIVOA Sentinel, a pharmaceutical regulatory intelligence assistant for the sales team.

You have access to tools that query the Sentinel database for:
- CDSCO drug failure signals (NSQ and Spurious drugs)
- Company rankings and regulatory scores
- FDA and EudraGMDP enrichment data
- Web evidence (recalls, closures, warning letters)
- LLM-powered compliance analysis

When a user asks about companies, signals, or regulatory data, use the appropriate tools.
Always provide actionable insights. Highlight high-score companies and paper-QMS evidence.

You have MEMORY of past conversations with this user. Use this context to provide
personalized, continuity-aware responses. Reference previous discussions when relevant.

FORMAT RESPONSES WITH MARKDOWN:
- Use **bold** for key terms and company names
- Use bullet points for lists
- Use markdown tables for comparisons (e.g. company rankings, score breakdowns)
- Use `code` for specific values, IDs, or technical terms
- Use > blockquotes for important warnings or regulatory notes
- Use ### headings to organize sections
- Keep responses clear, structured, and scannable

Example table format:
| Company | Score | Events | Risk |
|---------|-------|--------|------|
| Sun Pharma | 85 | 12 | High |

Always end with a clear actionable recommendation when possible."""


def _allow_null(node):
    """Recursively make JSON-Schema nodes nullable.

    MCP tools expose optional kwargs (e.g. ``q: str = None``) whose generated
    schema is ``{"type": "string"}``; when the model omits an optional param it
    sends ``null``, which Groq rejects with a 400 (parameters did not match
    schema). Allowing ``null`` everywhere lets the model safely pass ``null`` for
    optional arguments.
    """
    if isinstance(node, dict):
        t = node.get("type")
        if isinstance(t, str) and t != "null":
            node["type"] = [t, "null"]
        elif isinstance(t, list) and "null" not in t:
            node["type"] = [*t, "null"]
        for child in list(node.get("properties", {}).values()):
            _allow_null(child)
        if "items" in node:
            _allow_null(node["items"])
    return node


_SMALLTALK_RE = re.compile(
    r"^(hello|hi|hey|hola|thanks|thank you|bye|goodbye|good morning|good evening|yo)\b",
    re.IGNORECASE,
)


def _looks_like_smalltalk(message: str) -> bool:
    """Heuristic: tiny greetings / thanks are not data-seeking, so we must not
    force a tool call (Groq rejects `tool_choice="required"` when the model wants
    to answer plainly). Returns True for short greeting-like messages."""
    m = message.strip().lower()
    if len(m.split()) <= 6 and _SMALLTALK_RE.match(m):
        return True
    return False


def build_tool_schemas(tools: list[dict]) -> list[dict]:
    schemas = []
    for tool in tools:
        parameters = _allow_null(
            tool.get("inputSchema", {"type": "object", "properties": {}})
        )
        schemas.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "parameters": parameters,
            },
        })
    return schemas


async def stream_chat(message: str, history: list[dict] = None, user_id: str = "anonymous"):
    """Stream a chat response, executing MCP tools as needed."""
    history = history or []

    # Retrieve relevant past conversation context from ChromaDB
    memory_context = retrieve_context(user_id, message, n_results=5)

    # Build system message with memory
    system_content = SYSTEM_PROMPT
    if memory_context:
        system_content += f"\n\n### Relevant Past Conversations:\n{memory_context}"

    # Get available tools (served locally from the shared database)
    try:
        tools = list_tools()
        tool_schemas = build_tool_schemas(tools)
    except Exception:
        tool_schemas = []

    messages = [{"role": "system", "content": system_content}] + history + [{"role": "user", "content": message}]

    # Store user message in ChromaDB
    store_message(user_id, f"session:{user_id}", "user", message)

    # Agentic loop: let the model call MCP tools as many times as needed, up to
    # MAX_TOOL_TURNS. To avoid hallucinated answers when real data exists, the
    # FIRST turn of a data-seeking question forces `tool_choice="required"` (when
    # tools are available) so the model must consult a tool first. Greetings and
    # other small talk are excluded so they keep getting natural text replies.
    MAX_TOOL_TURNS = 6
    full_response = ""
    small_talk = _looks_like_smalltalk(message)

    try:
        for _turn in range(MAX_TOOL_TURNS):
            force_tools = bool(tool_schemas) and _turn == 0 and not small_talk
            tool_choice = "required" if force_tools else "auto"
            try:
                response = await groq_client.chat.completions.create(
                    model=settings.groq_model,
                    messages=messages,
                    tools=tool_schemas if tool_schemas else None,
                    tool_choice=tool_choice,
                    stream=False,
                    temperature=0.3,
                    max_tokens=2048,
                )
            except BadRequestError as e:
                # Forcing a tool is nice-to-have, not mandatory: if the model
                # refuses to call one (e.g. nothing fits), fall back to "auto".
                if force_tools and "required" in str(e):
                    response = await groq_client.chat.completions.create(
                        model=settings.groq_model,
                        messages=messages,
                        tools=tool_schemas if tool_schemas else None,
                        tool_choice="auto",
                        stream=False,
                        temperature=0.3,
                        max_tokens=2048,
                    )
                else:
                    raise

            choice = response.choices[0]
            msg = choice.message

            if getattr(msg, "tool_calls", None):
                # Build a clean assistant message (no extra SDK fields like
                # `annotations` that Groq rejects on the next turn).
                assistant_msg = {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in msg.tool_calls
                    ],
                }
                messages.append(assistant_msg)

                for tc in msg.tool_calls:
                    fn = tc.function
                    try:
                        args = json.loads(fn.arguments) if fn.arguments else {}
                    except json.JSONDecodeError:
                        args = {}

                    yield {"type": "tool_call", "id": tc.id, "name": fn.name, "arguments": args}

                    try:
                        result = call_tool(fn.name, args)
                        result_str = json.dumps(result, default=str)[:4000]
                    except Exception as e:
                        result_str = json.dumps({"error": str(e)})

                    yield {"type": "tool_result", "id": tc.id, "result": result_str}

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": result_str,
                    })

                # Loop again with the appended tool messages.
                continue

            # No tool calls: this is the final answer.
            full_response = msg.content or ""
            if full_response:
                yield {"type": "token", "content": full_response}

            # Store assistant response in ChromaDB
            store_message(user_id, f"session:{user_id}", "assistant", full_response)
            return

        # Exhausted tool turns without a final textual answer.
        if not full_response:
            full_response = "I wasn't able to complete that request."
            yield {"type": "token", "content": full_response}
        store_message(user_id, f"session:{user_id}", "assistant", full_response)

    except Exception as e:
        # Never drop the SSE stream: emit a graceful message instead of crashing
        # (e.g. a 400 from tool-call validation, a tool timeout, or a network error).
        full_response = "Sorry — I hit an error while working on that: %s" % (getattr(e, "message", str(e)))
        yield {"type": "token", "content": full_response}
        store_message(user_id, f"session:{user_id}", "assistant", full_response)
