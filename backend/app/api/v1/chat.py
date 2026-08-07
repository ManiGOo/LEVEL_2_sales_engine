from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, async_session
from app.models.conversation import Conversation, Message
from app.schemas.chat import ChatRequest
from app.services.chat_service import stream_chat
from app.dependencies import get_current_user
from datetime import datetime, timezone
import json

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/")
async def chat(
    body: ChatRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get or create conversation
    conversation_id = body.conversation_id
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user.id,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            conv = Conversation(id=conversation_id, user_id=user.id, title="New chat")
            db.add(conv)
            await db.commit()
    else:
        conv = Conversation(user_id=user.id, title=body.message[:80])
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conversation_id = conv.id

    # Save user message
    user_msg = Message(conversation_id=conversation_id, role="user", content=body.message)
    db.add(user_msg)

    # Auto-title from first message
    if conv.title == "New chat":
        conv.title = body.message[:80]

    await db.commit()

    history = [{"role": m.role, "content": m.content} for m in (body.history or [])]

    async def event_stream():
        full_response = ""
        async for event in stream_chat(body.message, history=history, user_id=user.id):
            if event.get("type") == "token":
                full_response += event["content"]
            yield f"data: {json.dumps(event, default=str)}\n\n"

        # Save assistant message
        async with async_session() as save_db:
            assistant_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
            )
            save_db.add(assistant_msg)

            # Update conversation timestamp
            result = await save_db.execute(
                select(Conversation).where(Conversation.id == conversation_id)
            )
            conv = result.scalar_one_or_none()
            if conv:
                conv.updated_at = datetime.now(timezone.utc)

            await save_db.commit()

        yield f"data: {json.dumps({'type': 'conversation_id', 'id': conversation_id})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
