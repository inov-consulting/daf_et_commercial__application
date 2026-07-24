"""Router API : Agent Commercial — enrichissement automatique des fiches clients.

Endpoints :
  POST /commercial/agent/enrich   → lance l'enrichissement (stream SSE)
"""
from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.deps import require_permission
from app.api.v1.schemas.commercial_agent import EnrichRequest
from app.infrastructure.ai.commercial_agent import stream_commercial_enrichment

router = APIRouter(prefix="/commercial/agent", tags=["commercial-agent"])

_agent_deps = [Depends(require_permission("prospects:read"))]


@router.post("/enrich", dependencies=_agent_deps)
async def enrich_clients(body: EnrichRequest) -> StreamingResponse:
    """Lance l'agent commercial pour enrichir les fiches clients Odoo.

    Stream SSE — chaque événement contient un token de réponse de l'agent.
    Le dernier événement contient `[RUN:{uuid}]` pour identifier le run.

    Format SSE :
        data: token
        ...
        data: [RUN:550e8400-...]
        data: [DONE]
    """

    async def event_stream() -> AsyncIterator[bytes]:
        async for token in stream_commercial_enrichment(limit=body.limit):
            yield f"data: {token}\n\n".encode()
        yield b"data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
