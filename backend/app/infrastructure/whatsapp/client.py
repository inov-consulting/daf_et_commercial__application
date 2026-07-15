"""Client WhatsApp — pywa (Python WhatsApp Cloud API framework).

pywa remplace facebook-business : il gère nativement le webhook FastAPI,
la vérification Meta, le parsing des payloads, et fournit des objets typés.

Initialisation :
    from app.infrastructure.whatsapp.client import setup_whatsapp, get_wa
    setup_whatsapp(fastapi_app)   ← appelé dans main.py après création de l'app

Envoi de messages depuis n'importe où :
    wa = get_wa()
    wa.send_message(to="22890123456", text="Bonjour")
"""

from __future__ import annotations

import logging
from uuid import uuid4

from app.core.config import settings

logger = logging.getLogger(__name__)

_wa = None   # instance pywa.WhatsApp — initialisée par setup_whatsapp()


# ── Initialisation ────────────────────────────────────────────────────────────

def setup_whatsapp(fastapi_app) -> None:
    """Crée l'instance pywa et enregistre les handlers.

    À appeler UNE SEULE FOIS dans main.py après `app = FastAPI(...)`.
    pywa enregistre automatiquement les routes GET/POST du webhook sur fastapi_app.
    """
    global _wa

    if not settings.whatsapp_phone_number_id or not settings.whatsapp_access_token:
        logger.warning("whatsapp.setup.skipped — WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN manquant")
        return

    from pywa_async import WhatsApp

    _wa = WhatsApp(
        phone_id=settings.whatsapp_phone_number_id,
        token=settings.whatsapp_access_token,
        waba_id=settings.whatsapp_business_account_id or None,
        server=fastapi_app,
        verify_token=settings.whatsapp_webhook_verify_token,
        webhook_endpoint="/api/v1/webhooks/whatsapp",
        filter_updates=True,
        validate_updates=False,
    )

    _register_handlers(_wa)
    logger.info("whatsapp.setup.done phone_id=%s", settings.whatsapp_phone_number_id)


def get_wa():
    """Retourne l'instance pywa.WhatsApp. Lève RuntimeError si non initialisée."""
    if _wa is None:
        raise RuntimeError(
            "WhatsApp non initialisé. Appeler setup_whatsapp(app) dans main.py."
        )
    return _wa


def is_configured() -> bool:
    return _wa is not None


# ── Handlers pywa ─────────────────────────────────────────────────────────────

def _register_handlers(wa) -> None:
    """Enregistre tous les handlers pywa sur l'instance WhatsApp."""
    from pywa_async.types import Message, MessageStatus

    @wa.on_message()
    async def _on_message(client, msg: Message) -> None:  # noqa: F841
        await _persist_and_handle(client, msg)

    @wa.on_message_status()
    async def _on_status(_client, status: MessageStatus) -> None:  # noqa: F841
        await _persist_delivery_status(status)


# ── Persistence + traitement des messages entrants ────────────────────────────

async def _persist_and_handle(_client, msg) -> None:
    logger.info("whatsapp.incoming wa_id=%s type=%s wamid=%s", msg.from_user.wa_id, msg.type, msg.id)
    """Persiste le message en BD puis lance l'agent IA pour les messages texte."""
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm

    wa_id: str = msg.from_user.wa_id
    contact_name: str | None = msg.from_user.name or None
    phone_number_id: str = msg.metadata.phone_number_id
    display_phone_number: str | None = msg.metadata.display_phone_number or None
    wamid: str = msg.id
    msg_type: str = msg.type.value  # "text", "image", "document", etc.

    # Déduplication — pywa peut recevoir des doublons (retry Meta 7j)
    if await WhatsAppMessageOrm.filter(wamid=wamid).exists():
        logger.info("whatsapp.message.duplicate wamid=%s — ignoré", wamid[:30])
        return

    # ── Upsert de la conversation ──────────────────────────────────────
    conversation, created = await WhatsAppConversationOrm.get_or_create(
        wa_id=wa_id,
        phone_number_id=phone_number_id,
        defaults={
            "id": uuid4(),
            "contact_name": contact_name,
            "display_phone_number": display_phone_number,
            "status": "active",
            "last_message_at": msg.timestamp,
        },
    )
    if not created:
        if contact_name and not conversation.contact_name:
            conversation.contact_name = contact_name
        conversation.last_message_at = msg.timestamp
        conversation.status = "active"
        await conversation.save()

    # ── Extraire le contenu selon le type (objets typés pywa) ─────────
    body_text: str | None = None
    media_id: str | None = None
    media_mime: str | None = None
    media_filename: str | None = None

    import json as _json
    from pywa_async.types import MessageType

    # Les voice notes ont msg.voice mais pas de MessageType dédié → vérifier avant le type
    if getattr(msg, "voice", None):
        media_id = msg.voice.id
        media_mime = getattr(msg.voice, "mime_type", "audio/ogg")
        msg_type = "audio"  # on normalise le type pour la BD
    elif msg.type == MessageType.TEXT:
        body_text = msg.text
    elif msg.type == MessageType.LOCATION and msg.location:
        loc = msg.location
        body_text = _json.dumps({
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "name": getattr(loc, "name", None),
            "address": getattr(loc, "address", None),
        }, ensure_ascii=False)
    elif msg.type == MessageType.IMAGE and msg.image:
        media_id = msg.image.id
        media_mime = msg.image.mime_type
    elif msg.type == MessageType.VIDEO and msg.video:
        media_id = msg.video.id
        media_mime = msg.video.mime_type
    elif msg.type == MessageType.AUDIO and msg.audio:
        media_id = msg.audio.id
        media_mime = msg.audio.mime_type
    elif msg.type == MessageType.DOCUMENT and msg.document:
        media_id = msg.document.id
        media_mime = msg.document.mime_type
        media_filename = msg.document.filename
    elif msg.type in (MessageType.UNKNOWN, MessageType.UNSUPPORTED):
        # Extraire le sous-type depuis le payload brut (poll_creation, agenda, etc.)
        raw = getattr(msg, "raw", None)
        if raw:
            try:
                msg_data = raw["entry"][0]["changes"][0]["value"]["messages"][0]
                unsupported_type = msg_data.get("unsupported", {}).get("type", "unknown")
                errors = msg_data.get("errors", [])
                body_text = _json.dumps({
                    "unsupported_type": unsupported_type,
                    "errors": [{"code": e.get("code"), "title": e.get("title")} for e in errors],
                }, ensure_ascii=False)
            except (KeyError, IndexError, TypeError):
                body_text = _json.dumps({"unsupported_type": "unknown"}, ensure_ascii=False)

        # Réponse automatique — informer l'expéditeur que ce type n'est pas pris en charge
        await _send_and_persist_autoreply(
            wa_id=wa_id,
            conversation_id=conversation.id,
            text=(
                "Désolé, nous ne pouvons pas lire ce type de contenu pour le moment. 🙏\n\n"
                "Vous pouvez nous envoyer :\n"
                "• 💬 Messages texte\n"
                "• 🎤 Audios / Notes vocales\n"
                "• 🖼️ Images\n"
                "• 🎥 Vidéos\n"
                "• 📄 Documents\n"
                "• 🔗 Liens"
            ),
        )

    # ── Téléchargement du média vers MinIO ────────────────────────────
    media_url: str | None = None
    audio_bytes: bytes | None = None
    if media_id:
        media_url, audio_bytes = await _download_media_to_storage(media_id, media_mime, media_filename)

    # ── Transcription automatique des messages audio ───────────────
    if msg.type == MessageType.AUDIO and audio_bytes and not body_text:
        body_text = await _transcribe_audio(audio_bytes, media_mime or "audio/ogg")

    # ── Persistance du message entrant ────────────────────────────────
    await WhatsAppMessageOrm.create(
        id=uuid4(),
        conversation_id=conversation.id,
        wamid=wamid,
        direction="inbound",
        message_type=msg_type,
        body=body_text,
        media_id=media_id,
        media_mime_type=media_mime,
        media_filename=media_filename,
        media_url=media_url,
        meta_timestamp=msg.timestamp,
        raw_payload=None,
    )

    logger.info("whatsapp.message.received wa_id=%s type=%s", _mask(wa_id), msg_type)


# ── Réponse automatique système ──────────────────────────────────────────────

async def _send_and_persist_autoreply(wa_id: str, conversation_id, text: str) -> None:
    """Envoie un message automatique et le persiste en BD comme message sortant système."""
    from datetime import datetime, timezone
    from app.infrastructure.db.models.whatsapp import WhatsAppMessageOrm

    sent_wamid = f"auto:{uuid4()}"
    delivery_status = "failed"

    try:
        wa = get_wa()
        sent = await wa.send_message(to=wa_id, text=text)
        sent_wamid = sent.id if hasattr(sent, "id") else sent_wamid
        delivery_status = "sent"
    except Exception:
        logger.warning("whatsapp.autoreply.send_failed wa_id=%s", _mask(wa_id))

    await WhatsAppMessageOrm.create(
        id=uuid4(),
        conversation_id=conversation_id,
        wamid=sent_wamid,
        direction="outbound",
        message_type="text",
        body=text,
        meta_timestamp=datetime.now(timezone.utc),
        delivery_status=delivery_status,
    )
    logger.info("whatsapp.autoreply.persisted wa_id=%s status=%s", _mask(wa_id), delivery_status)


# ── Téléchargement média Meta → MinIO ────────────────────────────────────────

async def _download_media_to_storage(
    media_id: str,
    mime_type: str | None,
    filename: str | None,
) -> tuple[str | None, bytes | None]:
    """Télécharge un média WhatsApp depuis Meta, l'upload dans MinIO et retourne (url, bytes).

    pywa.download_media() passe mime_type à httpx.stream() ce qui lève TypeError —
    on télécharge donc directement via httpx avec le Bearer token.
    """
    import mimetypes
    import httpx
    from app.infrastructure.storage.minio import StorageService

    try:
        wa = get_wa()

        # 1. Obtenir l'URL temporaire Meta (expire ~5 min)
        media_url_obj = await wa.get_media_url(media_id)
        download_url = media_url_obj.url
        resolved_mime = mime_type or getattr(media_url_obj, "mime_type", None) or "application/octet-stream"

        # 2. Télécharger directement avec httpx + Bearer token
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.get(
                download_url,
                headers={"Authorization": f"Bearer {settings.whatsapp_access_token}"},
            )
            resp.raise_for_status()
            data: bytes = resp.content

        # 3. Construire le nom de fichier
        ext = mimetypes.guess_extension(resolved_mime) or ""
        name = filename or f"wa_{media_id[:12]}{ext}"

        # 4. Upload dans MinIO
        storage = StorageService()
        minio_url = await storage.upload(
            data,
            filename=name,
            content_type=resolved_mime,
            folder="whatsapp/media",
        )
        logger.info("whatsapp.media.stored media_id=%s url=%s", media_id[:20], minio_url)
        return minio_url, data

    except Exception:
        logger.exception("whatsapp.media.download_failed media_id=%s", media_id[:20])
        return None, None


async def _transcribe_audio(data: bytes, mime_type: str) -> str | None:
    """Transcrit un audio WhatsApp via OpenAI Whisper. Retourne le texte ou None si échec."""
    import httpx

    if not settings.openai_api_key:
        logger.warning("whatsapp.audio.transcription_skipped — OPENAI_API_KEY manquant")
        return None

    # Choisir une extension reconnue par OpenAI (ogg, mp4, webm, m4a, wav, mp3)
    ext_map = {
        "audio/ogg": "ogg",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/mp4a-latm": "m4a",
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
    }
    ext = ext_map.get(mime_type, "ogg")

    try:
        async with httpx.AsyncClient(timeout=60) as http:
            resp = await http.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                files={"file": (f"audio.{ext}", data, mime_type)},
                data={"model": "whisper-1", "response_format": "json"},
            )
            resp.raise_for_status()
            text = resp.json().get("text", "").strip()
            logger.info("whatsapp.audio.transcribed chars=%d", len(text))
            return text or None
    except Exception:
        logger.exception("whatsapp.audio.transcription_failed")
        return None


# ── Persistence des statuts de livraison ─────────────────────────────────────

async def _persist_delivery_status(status) -> None:
    """Met à jour le statut de livraison d'un message sortant en BD."""
    from app.infrastructure.db.models.whatsapp import WhatsAppMessageOrm

    wamid = status.id
    new_status = status.status.value  # "sent" | "delivered" | "read" | "failed"

    msg = await WhatsAppMessageOrm.filter(wamid=wamid).first()
    if msg:
        msg.delivery_status = new_status
        if hasattr(status, "error") and status.error:
            msg.error_code = getattr(status.error, "code", None)
            msg.error_message = str(getattr(status.error, "message", ""))[:500]
        await msg.save()
        logger.debug("whatsapp.status.updated wamid=%s status=%s", wamid[:30], new_status)

    if new_status == "failed":
        logger.error("whatsapp.outbound.failed wamid=%s", wamid[:30])


# ── Helper ────────────────────────────────────────────────────────────────────

def _mask(phone: str) -> str:
    if len(phone) < 6:
        return "***"
    return phone[:3] + "***" + phone[-3:]
