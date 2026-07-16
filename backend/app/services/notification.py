"""Service central de notifications — point d'entrée unique pour tout événement.

Chaque appel à `create()` :
  1. Persiste la notification en BD (historique + badge)
  2. Envoie un push FCM (téléphone en arrière-plan)
  3. Diffuse via WebSocket (app ouverte)

Usage :
    from app.services.notification import NotificationService
    await NotificationService.create(
        user_id=user_id,
        notification_type="cr_ready",
        title="Compte rendu prêt",
        body="Le CR de la prospection ABC est disponible.",
        reference_type="compte_rendu",
        reference_id=cr_id,
    )
"""
from __future__ import annotations

import asyncio
import logging
from uuid import UUID

logger = logging.getLogger(__name__)


class NotificationService:

    @staticmethod
    async def create(
        user_id: UUID,
        notification_type: str,
        title: str,
        body: str = "",
        reference_type: str | None = None,
        reference_id: UUID | None = None,
        data: dict | None = None,
    ) -> "NotificationOrm":  # type: ignore[name-defined]
        """Crée et diffuse une notification à un utilisateur."""
        from uuid import uuid4
        from app.infrastructure.db.models.notification import NotificationOrm

        notif = await NotificationOrm.create(
            id=uuid4(),
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            body=body,
            status="unread",
            reference_type=reference_type,
            reference_id=reference_id,
            data=data,
        )

        # FCM + WebSocket en fire-and-forget (ne bloque pas l'appelant)
        asyncio.create_task(NotificationService._push(notif))
        asyncio.create_task(NotificationService._broadcast(notif))

        return notif

    @staticmethod
    async def create_for_users(
        user_ids: list[UUID],
        notification_type: str,
        title: str,
        body: str = "",
        reference_type: str | None = None,
        reference_id: UUID | None = None,
        data: dict | None = None,
    ) -> None:
        """Crée et diffuse la même notification à plusieurs utilisateurs."""
        await asyncio.gather(*[
            NotificationService.create(
                user_id=uid,
                notification_type=notification_type,
                title=title,
                body=body,
                reference_type=reference_type,
                reference_id=reference_id,
                data=data,
            )
            for uid in user_ids
        ])

    # ── Canaux de diffusion ────────────────────────────────────────────

    @staticmethod
    async def _push(notif) -> None:
        """Envoie un push FCM aux devices de l'utilisateur."""
        try:
            from app.infrastructure.db.models.user_device import UserDeviceOrm
            from app.infrastructure.firebase import fcm

            tokens = await UserDeviceOrm.filter(
                user_id=notif.user_id,
            ).values_list("fcm_token", flat=True)

            if tokens:
                await fcm.send_push(
                    tokens=list(tokens),
                    title=notif.title,
                    body=notif.body,
                    data={
                        "notification_id": str(notif.id),
                        "type": notif.notification_type,
                        "reference_type": notif.reference_type or "",
                        "reference_id": str(notif.reference_id) if notif.reference_id else "",
                    },
                )
        except Exception:
            logger.exception("notification.push.failed notif_id=%s", notif.id)

    @staticmethod
    async def _broadcast(notif) -> None:
        """Diffuse via WebSocket aux clients connectés de cet utilisateur."""
        try:
            from app.infrastructure.notifications.broadcaster import publish_notification
            await publish_notification(
                user_id=str(notif.user_id),
                payload={
                    "id": str(notif.id),
                    "type": notif.notification_type,
                    "title": notif.title,
                    "body": notif.body,
                    "status": notif.status,
                    "reference_type": notif.reference_type,
                    "reference_id": str(notif.reference_id) if notif.reference_id else None,
                    "data": notif.data,
                    "created_at": notif.created_at.isoformat(),
                },
            )
        except Exception:
            logger.exception("notification.broadcast.failed notif_id=%s", notif.id)
