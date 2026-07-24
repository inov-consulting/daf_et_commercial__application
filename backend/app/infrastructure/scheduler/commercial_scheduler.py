"""Scheduler APScheduler pour l'agent Commercial.

Cycle :
  - Au démarrage de l'application (trigger=startup)
  - Tous les jours à 07:00 UTC   (~08h Paris hiver / 09h Paris été)
  - Tous les jours à 18:00 UTC   (~19h Paris hiver / 20h Paris été)

Usage dans le lifespan FastAPI :
    from app.infrastructure.scheduler.commercial_scheduler import commercial_scheduler
    await commercial_scheduler.start()   # dans lifespan, avant yield
    await commercial_scheduler.stop()    # dans lifespan, après yield
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_JOB_MORNING = "commercial_agent_morning"
_JOB_EVENING = "commercial_agent_evening"

_HOUR_MORNING = 7   # 07:00 UTC
_HOUR_EVENING = 18  # 18:00 UTC
_LIMIT_PER_CYCLE = 50


class CommercialScheduler:
    """Gère les cycles automatiques de l'agent commercial."""

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler(timezone="UTC")
        self._running = False
        self._current_run: dict[str, Any] | None = None   # run en cours
        self._last_run: dict[str, Any] | None = None      # dernier run terminé

    # ── Cycle ─────────────────────────────────────────────────────────────

    async def _run_cycle(self, trigger: str = "scheduled") -> None:
        """Wrapper sécurisé autour de run_commercial_cycle. Ne lève jamais."""
        from app.infrastructure.ai.commercial_agent import run_commercial_cycle
        from app.infrastructure.db.repositories.commercial_run import CommercialRunRepository

        repo = CommercialRunRepository()
        started_at = datetime.now(timezone.utc)
        started_at_iso = started_at.isoformat()

        self._current_run = {
            "trigger": trigger,
            "started_at": started_at_iso,
            "status": "running",
            "run_id": None,
            "enriched": 0,
            "enrichment_errors": 0,
            "predictions": 0,
            "prediction_errors": 0,
        }
        logger.info("commercial.scheduler.cycle_start trigger=%s", trigger)

        db_run = None
        try:
            db_run = await repo.start(trigger=trigger, started_at=started_at)
            stats = await run_commercial_cycle(limit=_LIMIT_PER_CYCLE, trigger=trigger)
            await repo.complete(run_db_id=db_run.id, stats=stats)

            self._last_run = {
                "trigger": trigger,
                "started_at": started_at_iso,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "status": "completed",
                "run_id": stats["run_id"],
                "enriched": stats["enriched"],
                "enrichment_errors": stats["enrichment_errors"],
                "predictions": stats["predictions"],
                "prediction_errors": stats["prediction_errors"],
            }
            logger.info(
                "commercial.scheduler.cycle_done run_id=%s enriched=%d predictions=%d",
                stats["run_id"], stats["enriched"], stats["predictions"],
            )
        except Exception:
            if db_run is not None:
                try:
                    await repo.fail(run_db_id=db_run.id)
                except Exception:
                    logger.exception("commercial.scheduler.db_fail_update_error")
            self._last_run = {
                "trigger": trigger,
                "started_at": started_at_iso,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "status": "error",
                "run_id": None,
                "enriched": 0,
                "enrichment_errors": 0,
                "predictions": 0,
                "prediction_errors": 0,
            }
            logger.exception("commercial.scheduler.cycle_error trigger=%s", trigger)
        finally:
            self._current_run = None

    # ── Démarrage ─────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Démarre le scheduler : cycle au démarrage + cron 07h et 18h UTC."""
        if self._running:
            logger.warning("commercial.scheduler.already_running")
            return

        self._scheduler.add_job(
            self._run_cycle,
            trigger=CronTrigger(hour=_HOUR_MORNING, minute=0, timezone="UTC"),
            id=_JOB_MORNING,
            name="Agent Commercial — cycle matin (07:00 UTC)",
            replace_existing=True,
            kwargs={"trigger": "scheduled_morning"},
        )
        self._scheduler.add_job(
            self._run_cycle,
            trigger=CronTrigger(hour=_HOUR_EVENING, minute=0, timezone="UTC"),
            id=_JOB_EVENING,
            name="Agent Commercial — cycle soir (18:00 UTC)",
            replace_existing=True,
            kwargs={"trigger": "scheduled_evening"},
        )

        self._scheduler.start()
        self._running = True
        logger.info(
            "commercial.scheduler.started morning=%dh evening=%dh UTC",
            _HOUR_MORNING,
            _HOUR_EVENING,
        )

        asyncio.create_task(self._run_cycle(trigger="startup"))

    # ── Arrêt ─────────────────────────────────────────────────────────────

    async def stop(self) -> None:
        """Arrête le scheduler proprement."""
        if not self._running:
            return
        self._scheduler.shutdown(wait=False)
        self._running = False
        logger.info("commercial.scheduler.stopped")

    # ── Déclenchement manuel ──────────────────────────────────────────────

    async def trigger_now(self) -> None:
        """Lance un cycle en arrière-plan sans streaming (appel API admin)."""
        if self._current_run is not None:
            logger.warning("commercial.scheduler.trigger_skipped reason=cycle_already_running")
            return
        logger.info("commercial.scheduler.manual_trigger")
        asyncio.create_task(self._run_cycle(trigger="manual"))

    @property
    def is_running_cycle(self) -> bool:
        return self._current_run is not None

    # ── Statut ────────────────────────────────────────────────────────────

    def status(self) -> dict[str, Any]:
        """Retourne l'état complet du scheduler : config, prochain run, dernier run."""
        next_runs: dict[str, str | None] = {"morning": None, "evening": None}
        if self._running:
            for job_id, key in [(_JOB_MORNING, "morning"), (_JOB_EVENING, "evening")]:
                job = self._scheduler.get_job(job_id)
                if job and job.next_run_time:
                    next_runs[key] = job.next_run_time.isoformat()

        return {
            "scheduler_running": self._running,
            "schedule": f"{_HOUR_MORNING:02d}:00 UTC et {_HOUR_EVENING:02d}:00 UTC",
            "limit_per_cycle": _LIMIT_PER_CYCLE,
            "next_run_morning": next_runs["morning"],
            "next_run_evening": next_runs["evening"],
            "current_run": self._current_run,
            "last_run": self._last_run,
        }


# Singleton partagé entre le lifespan et les endpoints
commercial_scheduler = CommercialScheduler()
