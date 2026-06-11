"""Router /chat : interface de conversation multi-tours avec l'agent IA."""

import logging
from collections.abc import AsyncIterator
from typing import Annotated
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from app.api.deps import require_permission
from app.api.v1.schemas.chat import ChatRequest, ChatResponse, ToolInfo, TranscribeResponse
from app.core.config import settings
from app.infrastructure.ai.agent import list_available_tools, run_chat_session, stream_chat_session

logger = logging.getLogger(__name__)

# Formats audio supportés par OpenAI Whisper
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/mp4", "audio/mp4a", "audio/x-m4a",
    "audio/mpga", "audio/webm", "audio/wav", "audio/x-wav",
}

router = APIRouter(prefix="/chat", tags=["chat"])

_chat_deps = [Depends(require_permission("chat:create"))]


@router.post("", dependencies=_chat_deps)
async def chat(payload: ChatRequest) -> ChatResponse:
    """Envoie un message à l'agent et retourne la réponse complète.

    Si `session_id` est absent, une nouvelle session est créée et son UUID est retourné.
    Les appels suivants avec le même `session_id` maintiennent l'historique de conversation.
    """
    try:
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
    except PermissionError as exc:
        logger.warning("Permission ERP refusée: %s", exc)
        return ChatResponse(
            session_id=payload.session_id or uuid4(),
            response="Je n'ai pas accès à cette donnée dans le système. Veuillez contacter votre administrateur pour vérifier vos permissions.",
            tool_used=None,
            turn=1,
        )
    except RuntimeError as exc:
        if "permission" in str(exc).lower() or "access" in str(exc).lower():
            logger.warning("Erreur de permission ERP: %s", exc)
            return ChatResponse(
                session_id=payload.session_id or uuid4(),
                response="Je n'ai pas accès à cette donnée dans le système. Veuillez contacter votre administrateur pour vérifier vos permissions.",
                tool_used=None,
                turn=1,
            )
        raise


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


@router.post("/transcribe", dependencies=_chat_deps)
async def transcribe_audio(
    file: Annotated[UploadFile, File(...)],
) -> TranscribeResponse:
    """Transcrit un fichier audio en texte via OpenAI Whisper.

    Formats supportés : mp3, mp4, mpeg, mpga, m4a, wav, webm.
    Taille max : 25 Mo (limite OpenAI).
    """
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Format audio non supporté. Formats acceptés : {', '.join(ALLOWED_AUDIO_TYPES)}",
        )

    content = await file.read()
    if len(content) > 15 * 1024 * 1024:  # 15 Mo
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Fichier audio trop volumineux (max 15 Mo).",
        )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                },
                files={
                    "file": (file.filename, content, file.content_type or "application/octet-stream"),
                },
                data={
                    "model": "whisper-1",
                    "response_format": "json",
                },
            )
            response.raise_for_status()
            result = response.json()
            return TranscribeResponse(text=result.get("text", ""))
    except httpx.HTTPStatusError as exc:
        logger.error("Erreur OpenAI Whisper : %s - %s", exc.response.status_code, exc.response.text)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Erreur lors de la transcription. Veuillez réessayer.",
        ) from exc
    except Exception as exc:
        logger.exception("Erreur inattendue transcription")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur de transcription.",
        ) from exc
