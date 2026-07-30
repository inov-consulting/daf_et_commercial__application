"""Router WhatsApp — Messagerie entre utilisateurs Portalis et contacts WhatsApp.

Le webhook Meta (GET vérification + POST messages entrants) est géré
directement par pywa via setup_whatsapp(app) dans main.py.
Ce router expose les endpoints de lecture et l'envoi de réponses manuelles.

Endpoints :
  GET  /whatsapp/conversations                     → liste des conversations
  GET  /whatsapp/conversations/{id}                → détail d'une conversation
  GET  /whatsapp/conversations/{id}/messages       → messages d'une conversation
  POST /whatsapp/conversations/{id}/read           → marquer les messages entrants comme lus
  POST /whatsapp/conversations/{id}/reply          → répondre à un contact
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from app.api.deps import CurrentUser, require_permission

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

_read_deps   = [Depends(require_permission("messaging:read"))]
_create_deps = [Depends(require_permission("messaging:create"))]


# ── Schémas ───────────────────────────────────────────────────────────────────

class WhatsAppConversationOut(BaseModel):
    id: UUID
    wa_id: str
    contact_name: str | None
    display_phone_number: str | None
    status: str
    unread_count: int
    last_message_at: datetime | None
    created_at: datetime
    message_count: int = 0


class WhatsAppMessageOut(BaseModel):
    id: UUID
    wamid: str
    direction: str
    message_type: str
    body: str | None
    media_id: str | None
    media_url: str | None
    media_filename: str | None
    delivery_status: str | None
    error_message: str | None
    meta_timestamp: datetime | None
    created_at: datetime


def _mime_to_message_type(mime: str) -> str:
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    return "document"


async def _upload_file_to_minio(data: bytes, filename: str, content_type: str) -> str | None:
    """Upload les bytes vers MinIO et retourne l'URL publique."""
    try:
        from app.infrastructure.storage.minio import StorageService
        storage = StorageService()
        return await storage.upload(data, filename=filename, content_type=content_type, folder="whatsapp/outbound")
    except Exception:
        import logging
        logging.getLogger(__name__).exception("whatsapp.upload_file_to_minio failed")
        return None


async def _send_media_via_pywa(wa, to: str, msg_type: str, url: str, filename: str | None, caption: str | None) -> str:
    """Envoie le média via pywa et retourne le wamid."""
    try:
        if msg_type == "image":
            sent = await wa.send_image(to=to, image=url, caption=caption or "")
        elif msg_type == "audio":
            sent = await wa.send_audio(to=to, audio=url)
        elif msg_type == "video":
            sent = await wa.send_video(to=to, video=url, caption=caption or "")
        else:  # document
            sent = await wa.send_document(to=to, document=url, filename=filename or "document", caption=caption or "")
        return sent.id if hasattr(sent, "id") else f"out:{uuid4()}"
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Échec d'envoi WhatsApp : {exc}") from exc


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/webhook-info", dependencies=_read_deps)
async def webhook_info() -> dict:
    """Retourne l'URL du webhook Meta à configurer dans la console Meta Developer."""
    from app.core.config import settings
    endpoint = "/api/v1/webhooks/whatsapp"
    full_url = f"{settings.api_domain.rstrip('/')}{endpoint}" if settings.api_domain else f"<API_DOMAIN>{endpoint}"
    return {
        "webhook_url": full_url,
        "verify_token": "*** (voir WHATSAPP_WEBHOOK_VERIFY_TOKEN dans .env)",
        "subscribed_fields": ["messages", "message_deliveries", "message_reads"],
    }


@router.get("/conversations", dependencies=_read_deps)
async def list_conversations(
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[WhatsAppConversationOut]:
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm

    qs = WhatsAppConversationOrm.all()
    if status_filter:
        qs = qs.filter(status=status_filter)

    conversations = await qs.order_by("-last_message_at").offset(offset).limit(limit)

    result = []
    for c in conversations:
        count = await c.messages.all().count()
        result.append(WhatsAppConversationOut(
            id=c.id,
            wa_id=c.wa_id,
            contact_name=c.contact_name,
            display_phone_number=c.display_phone_number,
            status=c.status,
            unread_count=c.unread_count,
            last_message_at=c.last_message_at,
            created_at=c.created_at,
            message_count=count,
        ))
    return result


@router.get("/conversations/{conversation_id}", dependencies=_read_deps)
async def get_conversation(conversation_id: UUID) -> WhatsAppConversationOut:
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm

    conv = await WhatsAppConversationOrm.get_or_none(id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

    count = await conv.messages.all().count()
    return WhatsAppConversationOut(
        id=conv.id,
        wa_id=conv.wa_id,
        contact_name=conv.contact_name,
        display_phone_number=conv.display_phone_number,
        status=conv.status,
        unread_count=conv.unread_count,
        last_message_at=conv.last_message_at,
        created_at=conv.created_at,
        message_count=count,
    )


@router.get("/conversations/{conversation_id}/messages", dependencies=_read_deps)
async def get_messages(
    conversation_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[WhatsAppMessageOut]:
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm

    conv = await WhatsAppConversationOrm.get_or_none(id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

    messages = await WhatsAppMessageOrm.filter(
        conversation_id=conversation_id,
    ).order_by("meta_timestamp").offset(offset).limit(limit)

    return [
        WhatsAppMessageOut(
            id=m.id,
            wamid=m.wamid,
            direction=m.direction,
            message_type=m.message_type,
            body=m.body,
            media_id=m.media_id,
            media_url=m.media_url,
            media_filename=m.media_filename,
            delivery_status=m.delivery_status,
            error_message=m.error_message,
            meta_timestamp=m.meta_timestamp,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/read", dependencies=_create_deps)
async def mark_as_read(conversation_id: UUID) -> dict:
    """Marque comme lus tous les messages entrants sans statut de livraison.

    Met à jour les messages où `direction='inbound'` ET `delivery_status` est null
    en leur assignant `delivery_status='read'`.

    Retourne le nombre de messages mis à jour.
    """
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm

    conv = await WhatsAppConversationOrm.get_or_none(id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

    updated_count = await WhatsAppMessageOrm.filter(
        conversation_id=conversation_id,
        direction="inbound",
        delivery_status__isnull=True,
    ).update(delivery_status="read")

    conv.unread_count = 0
    await conv.save()

    from app.infrastructure.whatsapp.broadcaster import publish_read
    import asyncio as _asyncio
    _asyncio.create_task(publish_read(str(conversation_id)))

    return {"updated": updated_count, "unread_count": 0}


@router.post("/conversations/start", dependencies=_create_deps, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    phone: str = Form(..., description="Numéro international sans '+', ex: 22890123456"),
    text: str | None = Form(None),
    contact_name: str | None = Form(None),
    file: UploadFile | None = File(None),
) -> dict:
    """Initie une conversation WhatsApp avec un client et envoie le premier message.

    Utiliser `multipart/form-data` avec les champs :
    - `phone` (obligatoire) : numéro international sans '+'
    - `text` (optionnel) : message texte ou légende
    - `contact_name` (optionnel) : nom du contact
    - `file` (optionnel) : fichier à envoyer

    ⚠️  WhatsApp n'autorise les messages libres que si le client a écrit dans les 24h.
    """
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm
    from app.infrastructure.whatsapp.client import get_wa, is_configured
    from app.core.config import settings

    if not text and not file:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fournir au moins `text` ou `file`")

    if not is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WhatsApp non configuré")

    wa = get_wa()
    now = datetime.now(timezone.utc)
    msg_type = "text"
    media_url: str | None = None
    media_filename: str | None = None

    if file:
        content_type = file.content_type or "application/octet-stream"
        msg_type = _mime_to_message_type(content_type)
        media_filename = file.filename or f"file_{uuid4().hex[:8]}"
        data = await file.read()
        media_url = await _upload_file_to_minio(data, media_filename, content_type)
        if not media_url:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Échec de l'upload du fichier")
        sent_wamid = await _send_media_via_pywa(wa, phone, msg_type, media_url, media_filename, text)
    else:
        try:
            sent = await wa.send_message(to=phone, text=text)
            sent_wamid = sent.id if hasattr(sent, "id") else f"out:{uuid4()}"
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Échec d'envoi : {exc}") from exc

    conv, _ = await WhatsAppConversationOrm.get_or_create(
        wa_id=phone,
        phone_number_id=settings.whatsapp_phone_number_id,
        defaults={
            "id": uuid4(),
            "contact_name": contact_name,
            "display_phone_number": None,
            "status": "active",
            "last_message_at": now,
        },
    )
    conv.last_message_at = now
    conv.status = "active"
    if contact_name and not conv.contact_name:
        conv.contact_name = contact_name
    await conv.save()

    msg = await WhatsAppMessageOrm.create(
        id=uuid4(),
        conversation_id=conv.id,
        wamid=sent_wamid,
        direction="outbound",
        message_type=msg_type,
        body=text,
        media_url=media_url,
        media_filename=media_filename,
        meta_timestamp=now,
        delivery_status="sent",
    )

    return {
        "conversation_id": conv.id,
        "wa_id": conv.wa_id,
        "contact_name": conv.contact_name,
        "message_id": msg.id,
        "wamid": msg.wamid,
    }


@router.post("/conversations/{conversation_id}/reply", dependencies=_create_deps, status_code=status.HTTP_201_CREATED)
async def reply_to_conversation(
    conversation_id: UUID,
    text: str | None = Form(None),
    file: UploadFile | None = File(None),
) -> WhatsAppMessageOut:
    """Envoie un message au contact WhatsApp (texte, audio, image, vidéo ou document).

    Utiliser `multipart/form-data` :
    - `text` (optionnel) : contenu texte ou légende du média
    - `file` (optionnel) : fichier à envoyer

    Au moins un des deux doit être fourni.
    """
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm
    from app.infrastructure.whatsapp.client import get_wa, is_configured

    if not text and not file:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Fournir au moins `text` ou `file`")

    conv = await WhatsAppConversationOrm.get_or_none(id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

    if not is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WhatsApp non configuré")

    wa = get_wa()
    now = datetime.now(timezone.utc)

    msg_type = "text"
    media_url: str | None = None
    media_filename: str | None = None
    sent_wamid: str

    if file:
        content_type = file.content_type or "application/octet-stream"
        msg_type = _mime_to_message_type(content_type)
        media_filename = file.filename or f"file_{uuid4().hex[:8]}"
        data = await file.read()

        # Upload vers MinIO pour archivage
        media_url = await _upload_file_to_minio(data, media_filename, content_type)
        if not media_url:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Échec de l'upload du fichier")

        sent_wamid = await _send_media_via_pywa(wa, conv.wa_id, msg_type, media_url, media_filename, text)
    else:
        try:
            sent = await wa.send_message(to=conv.wa_id, text=text)
            sent_wamid = sent.id if hasattr(sent, "id") else f"out:{uuid4()}"
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Échec d'envoi WhatsApp : {exc}") from exc

    msg = await WhatsAppMessageOrm.create(
        id=uuid4(),
        conversation_id=conv.id,
        wamid=sent_wamid,
        direction="outbound",
        message_type=msg_type,
        body=text,
        media_url=media_url,
        media_filename=media_filename,
        meta_timestamp=now,
        delivery_status="sent",
    )

    conv.last_message_at = now
    await conv.save()

    return WhatsAppMessageOut(
        id=msg.id,
        wamid=msg.wamid,
        direction=msg.direction,
        message_type=msg.message_type,
        body=msg.body,
        media_id=None,
        media_url=msg.media_url,
        media_filename=msg.media_filename,
        delivery_status=msg.delivery_status,
        error_message=None,
        meta_timestamp=msg.meta_timestamp,
        created_at=msg.created_at,
    )


# ── WebSocket — Temps réel ────────────────────────────────────────────────────

@router.websocket("/conversations/stream")
async def ws_stream_all(websocket: WebSocket):
    """WebSocket global — reçoit un événement à chaque nouveau message (toutes conversations).

    Connexion : ws://.../api/v1/whatsapp/conversations/stream
    Format reçu : {"event": "new_message", "data": {"conversation_id": "...", ...}}
    """
    from app.infrastructure.whatsapp.broadcaster import subscribe_all

    await websocket.accept()
    try:
        async for payload in subscribe_all():
            await websocket.send_text(json.dumps(payload, default=str))
    except WebSocketDisconnect:
        pass


@router.websocket("/conversations/{conversation_id}/stream")
async def ws_stream_conversation(websocket: WebSocket, conversation_id: UUID):
    """WebSocket d'une conversation — reçoit chaque nouveau message en temps réel.

    Connexion : ws://.../api/v1/whatsapp/conversations/{id}/stream
    Format reçu : {"event": "message", "data": {"id": "...", "body": "...", ...}}
    """
    from app.infrastructure.whatsapp.broadcaster import subscribe_conversation

    await websocket.accept()
    try:
        async for payload in subscribe_conversation(str(conversation_id)):
            await websocket.send_text(json.dumps(payload, default=str))
    except WebSocketDisconnect:
        pass


# ── SSE — Temps réel ──────────────────────────────────────────────────────────

class GenerateCRIn(BaseModel):
    extra_note_ids: list[UUID] = []


async def _run_whatsapp_cr_task(
    cr_id: UUID,
    conversation_id: UUID,
    content: str,
    extra_note_ids: list[UUID] | None,
    author_id: UUID,
    contact_name: str | None,
) -> None:
    """Tâche de fond : génère le CR WhatsApp puis notifie l'auteur par email."""
    from app.infrastructure.db.models.note import CompteRenduOrm
    from app.infrastructure.storage.minio import StorageService
    from app.services.compte_rendu import CompteRenduService
    from app.services.notification_email import notify_author_cr_failed, notify_author_cr_ready
    import logging
    logger = logging.getLogger(__name__)

    cr = await CompteRenduOrm.get_or_none(id=cr_id)
    if not cr:
        logger.error("whatsapp_cr_task.cr_not_found cr_id=%s", cr_id)
        return

    service = CompteRenduService()
    await service.generate_raw_content_into(
        cr=cr,
        content=content,
        extra_note_ids=extra_note_ids,
        contact_name=contact_name,
    )

    await cr.refresh_from_db()

    if cr.generation_status == "done":
        storage = StorageService()
        download_url = storage.get_url(cr.minio_path, expires_in=86400)
        await notify_author_cr_ready(
            author_id=author_id,
            cr_id=cr_id,
            prospect_name=contact_name,
            download_url=download_url,
            cr_version=cr.version,
        )
    else:
        await notify_author_cr_failed(
            author_id=author_id,
            cr_id=cr_id,
            prospect_name=contact_name,
            error=cr.generation_error or "Erreur inconnue",
        )


@router.post(
    "/conversations/{conversation_id}/generate-cr",
    dependencies=_create_deps,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate_cr_from_conversation(
    conversation_id: UUID,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    body: GenerateCRIn = GenerateCRIn(),
) -> dict:
    """Lance la génération d'un compte-rendu PDF depuis les messages WhatsApp en tâche de fond.

    Retourne immédiatement un 202 avec l'ID du CR.
    Pollinez GET /compte-rendus/{cr_id}/status pour suivre la progression.
    Un email est envoyé à l'auteur quand la génération est terminée.
    """
    from app.infrastructure.db.models.note import CompteRenduOrm
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm
    from app.core.config import settings as _settings

    conv = await WhatsAppConversationOrm.get_or_none(id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

    messages = await WhatsAppMessageOrm.filter(
        conversation_id=conversation_id,
    ).order_by("meta_timestamp")

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aucun message dans cette conversation",
        )

    contact_name = conv.contact_name or conv.wa_id
    msg_count = len(messages)

    lines = [
        f"Titre : Compte rendu — {contact_name}",
        f"Nombre de messages : {msg_count}",
        f"Conversation WhatsApp avec {contact_name}",
        "",
    ]
    for m in messages:
        who = "Client" if m.direction == "inbound" else "Nous"
        ts = m.meta_timestamp.strftime("%d/%m/%Y %H:%M") if m.meta_timestamp else ""
        if m.message_type == "text" and m.body:
            lines.append(f"[{ts}] {who}: {m.body}")
        else:
            lines.append(f"[{ts}] {who}: [{m.message_type.upper()} — media_id={m.media_id or '?'}]")

    content = "\n".join(lines)

    existing_count = await CompteRenduOrm.filter(
        parent_type="whatsapp", parent_id=conversation_id
    ).count()
    version = existing_count + 1

    cr = await CompteRenduOrm.create(
        parent_type="whatsapp",
        parent_id=conversation_id,
        version=version,
        status="draft",
        generation_status="pending",
        minio_bucket=_settings.minio_bucket,
        minio_path=f"cr/whatsapp/{conversation_id}/pending-v{version}",
        generated_by="ai",
        created_by_id=current_user.id,
    )

    background_tasks.add_task(
        _run_whatsapp_cr_task,
        cr_id=cr.id,
        conversation_id=conversation_id,
        content=content,
        extra_note_ids=body.extra_note_ids or None,
        author_id=current_user.id,
        contact_name=contact_name,
    )

    return {
        "id": cr.id,
        "parent_type": cr.parent_type,
        "parent_id": cr.parent_id,
        "version": cr.version,
        "generation_status": cr.generation_status,
        "contact_name": contact_name,
        "message_count": msg_count,
        "created_at": cr.created_at,
        "message": "Génération lancée en arrière-plan. Consultez le statut via GET /compte-rendus/{id}/status.",
    }
