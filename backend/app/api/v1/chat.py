"""Router /chat : interface de conversation multi-tours avec l'agent IA."""

import logging
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import require_permission
from app.infrastructure.ai.agent import list_available_tools, run_chat_session, stream_chat_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

_chat_deps = [Depends(require_permission("chat:create"))]


class ChatRequest(BaseModel):
    session_id: UUID | None = None   # None = nouvelle session (UUID généré par le serveur)
    message: str


class ChatResponse(BaseModel):
    session_id: UUID
    response: str
    tool_used: str | None            # premier tool utilisé dans ce tour, null si aucun
    turn: int                        # numéro d'échange dans la session (commence à 1)


class ToolInfo(BaseModel):
    name: str
    description: str


@router.post("", dependencies=_chat_deps)
async def chat(payload: ChatRequest) -> ChatResponse:
    """Envoie un message à l'agent et retourne la réponse complète.

    Si `session_id` est absent, une nouvelle session est créée et son UUID est retourné.
    Les appels suivants avec le même `session_id` maintiennent l'historique de conversation.
    """
    result = await run_chat_session(
        message=payload.message,
        session_id=payload.session_id,
    )
    return ChatResponse(
        session_id=result.session_id,
        response=result.response,
        tool_used=result.tool_used,
        turn=result.turn,
    )


@router.post("/stream", dependencies=_chat_deps)
async def chat_stream(payload: ChatRequest) -> StreamingResponse:
    """Stream la réponse token par token (SSE).

    Le dernier événement SSE contient `[SESSION:{uuid}]` pour récupérer le session_id.

    Format SSE :
        data: token1
        data: token2
        ...
        data: [SESSION:550e8400-e29b-41d4-a716-446655440000]
        data: [DONE]
    """

    async def event_stream() -> AsyncIterator[bytes]:
        async for token in stream_chat_session(
            message=payload.message,
            session_id=payload.session_id,
        ):
            yield f"data: {token}\n\n".encode()
        yield b"data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/tools", dependencies=_chat_deps)
async def list_tools() -> list[ToolInfo]:
    """Liste tous les tools disponibles pour l'agent (locaux + MCP externes)."""
    tools = await list_available_tools()
    return [ToolInfo(name=t["name"], description=t["description"]) for t in tools]
