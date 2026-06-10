"""Tâches Celery pour la synchronisation Prospects.

Usage:
    - celery beat: exécution périodique (toutes les 5 min)
    - worker: exécution asynchrone des syncs lourdes
"""

from datetime import datetime

from celery import shared_task

from app.core.logging import get_logger
from app.services.prospect_sync import run_periodic_sync

logger = get_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_prospects_periodic(self, full_sync: bool = False) -> dict:
    """Tâche Celery: Synchronise tous les prospects avec Odoo.

    À configurer dans celery beat pour exécution périodique:
        'sync-prospects-every-5min': {
            'task': 'app.tasks.prospect_tasks.sync_prospects_periodic',
            'schedule': 300.0,  # 5 minutes
        }

    Args:
        full_sync: Si True, force la récupération complète depuis Odoo.

    Returns:
        Rapport de synchronisation.
    """
    logger.info("[Celery Task] Démarrage sync prospects", extra={"full_sync": full_sync})

    async def _run():
        return await run_periodic_sync()

    try:
        import asyncio
        result = asyncio.run(_run())
        logger.info(
            "[Celery Task] Sync terminée",
            extra={
                "created": result.get("created"),
                "updated": result.get("updated"),
                "errors": len(result.get("errors", [])),
            },
        )
        return result

    except Exception as exc:
        logger.exception("[Celery Task] Échec sync prospects")
        # Retry automatique Celery
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3)
def sync_single_prospect_task(self, prospect_id: str) -> dict:
    """Tâche Celery: Synchronise un prospect spécifique.

    Usage: déclenché après création/mise à jour pour rafraîchir les données.

    Args:
        prospect_id: UUID du prospect Portalis.

    Returns:
        Données Odoo fraîches.
    """
    from uuid import UUID

    from app.infrastructure.db.models.prospect import ProspectOrm
    from app.services.prospect_sync import ProspectSyncService

    logger.info("[Celery Task] Sync single prospect", extra={"prospect_id": prospect_id})

    async def _run():
        prospect = await ProspectOrm.get_or_none(id=UUID(prospect_id))

        if not prospect:
            return {"error": "Prospect non trouvé"}

        service = ProspectSyncService()
        return await service.sync_single_prospect(prospect)

    try:
        import asyncio
        return asyncio.run(_run())

    except Exception as exc:
        logger.exception("[Celery Task] Échec sync single prospect")
        raise self.retry(exc=exc)
