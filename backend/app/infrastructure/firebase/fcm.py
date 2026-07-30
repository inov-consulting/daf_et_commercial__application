"""Service Firebase Cloud Messaging (FCM) — notifications push vers Flutter/Web.

Initialisation unique au démarrage de l'app via setup_firebase().
Utilisation :
    await fcm.send_push(tokens=[...], title="...", body="...", data={...})
    await fcm.notify_whatsapp_message(conversation_id, contact_name, preview)
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_initialized = False


def setup_firebase() -> None:
    """Initialise le SDK Firebase Admin. À appeler une seule fois dans main.py."""
    global _initialized

    from app.core.config import settings

    if not settings.firebase_credentials_path:
        logger.warning("firebase.setup.skipped — FIREBASE_CREDENTIALS_PATH manquant")
        return

    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.firebase_credentials_path)
            firebase_admin.initialize_app(cred)

        _initialized = True
        logger.info("firebase.setup.done credentials=%s", settings.firebase_credentials_path)
    except Exception:
        logger.exception("firebase.setup.failed")


def is_configured() -> bool:
    return _initialized


async def send_push(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> None:
    """Envoie une notification push à une liste de tokens FCM.

    Filtre automatiquement les tokens invalides/expirés et les retire de la BD.
    """
    if not _initialized or not tokens:
        return

    import asyncio
    from firebase_admin import messaging

    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound="default", badge=1),
            )
        ),
    )

    try:
        response = await asyncio.to_thread(messaging.send_each_for_multicast, message)
        logger.info("fcm.sent success=%d failure=%d", response.success_count, response.failure_count)

        # Nettoyer les tokens invalides
        invalid_tokens = [
            tokens[i]
            for i, r in enumerate(response.responses)
            if not r.success and _is_invalid_token_error(r.exception)
        ]
        if invalid_tokens:
            await _remove_invalid_tokens(invalid_tokens)
    except Exception:
        logger.exception("fcm.send_push.failed")


async def notify_whatsapp_message(
    conversation_id: str,
    contact_name: str | None,
    message_preview: str,
    message_type: str = "text",
) -> None:
    """Notifie toute l'équipe qu'un nouveau message WhatsApp est arrivé."""
    if not _initialized:
        return

    tokens = await _get_all_tokens()
    if not tokens:
        return

    sender = contact_name or "Inconnu"
    if message_type == "audio":
        preview = "🎤 Message vocal"
    elif message_type == "image":
        preview = "🖼️ Image"
    elif message_type == "video":
        preview = "🎥 Vidéo"
    elif message_type == "document":
        preview = "📄 Document"
    else:
        preview = message_preview[:100] if message_preview else "Nouveau message"

    await send_push(
        tokens=tokens,
        title=f"💬 WhatsApp Business — {sender}",
        body=preview,
        data={
            "type": "whatsapp_message",
            "conversation_id": str(conversation_id),
        },
    )


async def _get_all_tokens() -> list[str]:
    """Récupère tous les FCM tokens actifs en BD."""
    try:
        from app.infrastructure.db.models.user_device import UserDeviceOrm
        devices = await UserDeviceOrm.all().values_list("fcm_token", flat=True)
        return [t for t in devices if t]
    except Exception:
        logger.exception("fcm.get_all_tokens.failed")
        return []


async def _remove_invalid_tokens(tokens: list[str]) -> None:
    """Supprime les tokens FCM invalides/expirés de la BD."""
    try:
        from app.infrastructure.db.models.user_device import UserDeviceOrm
        await UserDeviceOrm.filter(fcm_token__in=tokens).delete()
        logger.info("fcm.tokens.cleaned count=%d", len(tokens))
    except Exception:
        logger.exception("fcm.remove_invalid_tokens.failed")


def _is_invalid_token_error(exc) -> bool:
    if exc is None:
        return False
    code = getattr(exc, "code", "") or ""
    return code in ("registration-token-not-registered", "invalid-registration-token")
