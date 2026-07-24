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

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_JOB_MORNING = "commercial_agent_morning"
_JOB_EVENING = "commercial_agent_evening"

# Heures UTC des deux cycles quotidiens
_HOUR_MORNING = 7   # 07:00 UTC
_HOUR_EVENING = 18  # 18:00 UTC

# Nombre max de clients traités par cycle (évite les runs trop longs)
_LIMIT_PER_CYCLE = 50


class CommercialScheduler:
    """Gère les cycles automatiques de l'agent commercial."""

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler(timezone="UTC")
        self._running = False

    # ── Cycle ─────────────────────────────────────────────────────────────

    async def _run_cycle(self, trigger: str = "scheduled") -> None:
        """Wrapper sécurisé autour de run_commercial_cycle. Ne lève jamais."""
        from app.infrastructure.ai.commercial_agent import run_commercial_cycle

        logger.info("commercial.scheduler.cycle_start trigger=%s", trigger)
        try:
            run_id = await run_commercial_cycle(limit=_LIMIT_PER_CYCLE, trigger=trigger)
            logger.info("commercial.scheduler.cycle_done run_id=%s", run_id)
        except Exception:
            logger.exception("commercial.scheduler.cycle_error trigger=%s", trigger)

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

        # Cycle immédiat au démarrage (non bloquant)
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
        """Lance un cycle immédiatement (appelé depuis l'API)."""
        logger.info("commercial.scheduler.manual_trigger")
        asyncio.create_task(self._run_cycle(trigger="manual"))

    # ── Statut ────────────────────────────────────────────────────────────

    def status(self) -> dict:
        """Retourne l'état courant du scheduler."""
        next_runs: dict[str, str | None] = {"morning": None, "evening": None}
        if self._running:
            for job_id, key in [(_JOB_MORNING, "morning"), (_JOB_EVENING, "evening")]:
                job = self._scheduler.get_job(job_id)
                if job and job.next_run_time:
                    next_runs[key] = job.next_run_time.isoformat()
        return {
            "running": self._running,
            "schedule": f"{_HOUR_MORNING:02d}:00 UTC et {_HOUR_EVENING:02d}:00 UTC",
            "next_run_morning": next_runs["morning"],
            "next_run_evening": next_runs["evening"],
        }


# Singleton partagé entre le lifespan et les endpoints
commercial_scheduler = CommercialScheduler()
