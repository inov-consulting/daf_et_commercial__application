"""Repository pour les cycles d'exécution de l'agent commercial."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from app.infrastructure.db.models.commercial_run import CommercialRunOrm


class CommercialRunRepository:

    async def start(self, trigger: str, started_at: datetime) -> CommercialRunOrm:
        return await CommercialRunOrm.create(
            trigger=trigger,
            status="running",
            started_at=started_at,
        )

    async def complete(self, run_db_id: UUID, stats: dict) -> CommercialRunOrm:
        run = await CommercialRunOrm.get(id=run_db_id)
        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        run.run_id = stats.get("run_id")
        run.enriched = stats.get("enriched", 0)
        run.enrichment_errors = stats.get("enrichment_errors", 0)
        run.predictions = stats.get("predictions", 0)
        run.prediction_errors = stats.get("prediction_errors", 0)
        await run.save()
        return run

    async def fail(self, run_db_id: UUID) -> CommercialRunOrm:
        run = await CommercialRunOrm.get(id=run_db_id)
        run.status = "error"
        run.completed_at = datetime.now(timezone.utc)
        await run.save()
        return run

    async def list_recent(self, limit: int = 20) -> list[CommercialRunOrm]:
        return await CommercialRunOrm.all().order_by("-started_at").limit(limit)

    async def get_last(self) -> CommercialRunOrm | None:
        return await CommercialRunOrm.all().order_by("-started_at").first()
