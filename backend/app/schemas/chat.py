from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str
    tool_calls: list[dict] | None = None


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] | None = None
    conversation_id: str | None = None
