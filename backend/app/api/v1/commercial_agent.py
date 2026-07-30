"""Router API : Agent Commercial — enrichissement automatique des fiches clients.

Endpoints :
  GET  /commercial/agent/status      → état du scheduler + dernier run
  GET  /commercial/agent/runs        → historique des runs (base de données)
  POST /commercial/agent/trigger     → déclenche un cycle en arrière-plan
  POST /commercial/agent/enrich      → lance l'enrichissement avec streaming SSE
"""
from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentCompany, require_permission
from app.api.v1.schemas.commercial_agent import AgentStatusOut, CommercialRunOut, EnrichRequest, TriggerOut
from app.infrastructure.ai.commercial_agent import stream_commercial_enrichment

router = APIRouter(prefix="/commercial/agent", tags=["commercial-agent"])

_read_deps   = [Depends(require_permission("commercial:read"))]
_create_deps = [Depends(require_permission("commercial:create"))]


@router.get("/status", dependencies=_read_deps)
async def get_agent_status() -> AgentStatusOut:
    """État du scheduler : cycle en cours, dernier run (mémoire), prochain déclenchement."""
    from app.infrastructure.scheduler.commercial_scheduler import commercial_scheduler
    return commercial_scheduler.status()


@router.get("/runs", dependencies=_read_deps)
async def list_runs(
    company: CurrentCompany,
    limit: int = Query(20, ge=1, le=100),
) -> list[CommercialRunOut]:
    """Historique persistant des cycles de l'agent commercial (base de données).

    Chaque entrée représente un cycle : trigger, statut, nombre de clients enrichis,
    nombre de prédictions créées, erreurs.
    """
    from app.infrastructure.db.repositories.commercial_run import CommercialRunRepository
    repo = CommercialRunRepository()
    runs = await repo.list_recent(limit=limit, company_id=company.id)
    return [
        CommercialRunOut(
            id=r.id,
            trigger=r.trigger,
            status=r.status,
            started_at=r.started_at,
            completed_at=r.completed_at,
            run_id=r.run_id,
            enriched=r.enriched,
            enrichment_errors=r.enrichment_errors,
            predictions=r.predictions,
            prediction_errors=r.prediction_errors,
        )
        for r in runs
    ]


@router.post("/trigger", dependencies=_create_deps)
async def trigger_cycle() -> TriggerOut:
    """Déclenche immédiatement un cycle d'enrichissement en arrière-plan.

    Sans streaming — le résultat sera visible dans `GET /status` (last_run)
    et dans `GET /commercial/predictions`.

    Si un cycle est déjà en cours, la requête est ignorée (skipped=true).
    """
    from app.infrastructure.scheduler.commercial_scheduler import commercial_scheduler

    if commercial_scheduler.is_running_cycle:
        return TriggerOut(message="Un cycle est déjà en cours", skipped=True)

    await commercial_scheduler.trigger_now()
    return TriggerOut(message="Cycle déclenché en arrière-plan", skipped=False)


@router.post("/enrich", dependencies=_create_deps)
async def enrich_clients(body: EnrichRequest) -> StreamingResponse:
    """Lance l'agent commercial avec streaming SSE (run interactif).

    Chaque événement SSE contient un token de réponse de l'agent.
    Le dernier token utile est `[RUN:{uuid}]` pour identifier le run,
    suivi de `[DONE]` pour signaler la fin du stream.

    Format SSE :
        data: token\\n\\n
        ...
        data: [RUN:550e8400-...]\\n\\n
        data: [DONE]\\n\\n
    """

    async def event_stream() -> AsyncIterator[bytes]:
        async for token in stream_commercial_enrichment(limit=body.limit):
            yield f"data: {token}\n\n".encode()
        yield b"data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
