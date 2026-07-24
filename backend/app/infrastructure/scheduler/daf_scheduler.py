"""Scheduler APScheduler pour l'agent DAF.

Démarre immédiatement au lancement de l'application (trigger=startup),
puis relance un cycle toutes les 6 heures (trigger=scheduled).

Usage dans le lifespan FastAPI :
    from app.infrastructure.scheduler.daf_scheduler import DafScheduler
    scheduler = DafScheduler()
    await scheduler.start()   # dans lifespan, avant yield
    await scheduler.stop()    # dans lifespan, après yield
"""

from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_INTERVAL_HOURS = 6
_JOB_ID = "daf_agent_cycle"


class DafScheduler:
    """Gère le cycle de vie de l'agent DAF en arrière-plan."""

    def __init__(self) -> None:
        self._scheduler = AsyncIOScheduler(timezone="UTC")
        self._running = False

    # ── Cycle unique ──────────────────────────────────────────────────────

    async def _run_cycle(self, trigger: str = "scheduled") -> None:
        """Wrapper sécurisé autour de run_daf_cycle. Ne lève jamais d'exception."""
        from app.infrastructure.ai.daf_agent import run_daf_cycle

        logger.info("daf.scheduler.cycle_start trigger=%s", trigger)
        try:
            run_id = await run_daf_cycle(trigger=trigger)
            logger.info("daf.scheduler.cycle_done run_id=%s", run_id)
        except Exception:
            logger.exception("daf.scheduler.cycle_unhandled_error trigger=%s", trigger)

    # ── Démarrage ─────────────────────────────────────────────────────────

    async def start(self) -> None:
        """Démarre le scheduler : cycle immédiat puis toutes les 6h."""
        if self._running:
            logger.warning("daf.scheduler.already_running")
            return

        # Cycle planifié toutes les 6h
        self._scheduler.add_job(
            self._run_cycle,
            trigger=IntervalTrigger(hours=_INTERVAL_HOURS),
            id=_JOB_ID,
            name="Agent DAF — cycle financier",
            replace_existing=True,
            kwargs={"trigger": "scheduled"},
        )
        self._scheduler.start()
        self._running = True
        logger.info("daf.scheduler.started interval_hours=%d", _INTERVAL_HOURS)

        # Notifier le démarrage de l'agent
        try:
            from app.infrastructure.ai.daf_agent import _notify_daf_status
            await _notify_daf_status("started", trigger="startup")
        except Exception:
            logger.warning("daf.scheduler.start_notify_failed", exc_info=True)

        # Cycle immédiat au démarrage (dans une tâche parallèle pour ne pas bloquer le lifespan)
        asyncio.create_task(self._run_cycle(trigger="startup"))

    # ── Arrêt ─────────────────────────────────────────────────────────────

    async def stop(self) -> None:
        """Arrête le scheduler proprement."""
        if not self._running:
            return
        self._scheduler.shutdown(wait=False)
        self._running = False
        logger.info("daf.scheduler.stopped")

        try:
            from app.infrastructure.ai.daf_agent import _notify_daf_status
            await _notify_daf_status("stopped")
        except Exception:
            logger.warning("daf.scheduler.stop_notify_failed", exc_info=True)

    # ── Déclenchement manuel ──────────────────────────────────────────────

    async def trigger_now(self) -> None:
        """Lance un cycle immédiatement (appelé depuis l'API)."""
        logger.info("daf.scheduler.manual_trigger")
        asyncio.create_task(self._run_cycle(trigger="manual"))

    # ── Statut ────────────────────────────────────────────────────────────

    def status(self) -> dict:
        """Retourne l'état courant du scheduler."""
        next_run = None
        if self._running:
            job = self._scheduler.get_job(_JOB_ID)
            if job and job.next_run_time:
                next_run = job.next_run_time.isoformat()

        return {
            "running": self._running,
            "interval_hours": _INTERVAL_HOURS,
            "next_run_at": next_run,
        }


# Singleton partagé entre le lifespan et les endpoints
daf_scheduler = DafScheduler()
