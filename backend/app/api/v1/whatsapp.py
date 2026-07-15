"""Router WhatsApp — Messagerie entre utilisateurs Portalis et contacts WhatsApp.

Le webhook Meta (GET vérification + POST messages entrants) est géré
directement par pywa via setup_whatsapp(app) dans main.py.
Ce router expose les endpoints de lecture et l'envoi de réponses manuelles.

Endpoints :
  GET  /whatsapp/conversations                     → liste des conversations
  GET  /whatsapp/conversations/{id}                → détail d'une conversation
  GET  /whatsapp/conversations/{id}/messages       → messages d'une conversation
  POST /whatsapp/conversations/{id}/reply          → répondre à un contact
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import require_permission

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

_read_deps = [Depends(require_permission("transport:read"))]
_write_deps = [Depends(require_permission("transport:write"))]


# ── Schémas ───────────────────────────────────────────────────────────────────

class WhatsAppConversationOut(BaseModel):
    id: UUID
    wa_id: str
    contact_name: str | None
    display_phone_number: str | None
    status: str
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


class ReplyIn(BaseModel):
    text: str


class StartConversationIn(BaseModel):
    phone: str   # numéro international sans '+', ex: "22890123456"
    text: str
    contact_name: str | None = None


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


@router.post("/conversations/start", dependencies=_write_deps, status_code=status.HTTP_201_CREATED)
async def start_conversation(body: StartConversationIn) -> dict:
    """Initie une conversation WhatsApp avec un client et envoie le premier message.

    ⚠️  WhatsApp n'autorise les messages texte libres que si le client a écrit dans les 24h.
    Pour contacter un client froid, utilisez un template Meta approuvé via /whatsapp/send-template.
    """
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm
    from app.infrastructure.whatsapp.client import get_wa, is_configured
    from app.core.config import settings

    if not is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WhatsApp non configuré")

    wa = get_wa()
    try:
        sent = await wa.send_message(to=body.phone, text=body.text)
        sent_wamid = sent.id if hasattr(sent, "id") else f"out:{uuid4()}"
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Échec d'envoi : {exc}") from exc

    now = datetime.now(timezone.utc)

    conv, _ = await WhatsAppConversationOrm.get_or_create(
        wa_id=body.phone,
        phone_number_id=settings.whatsapp_phone_number_id,
        defaults={
            "id": uuid4(),
            "contact_name": body.contact_name,
            "display_phone_number": None,
            "status": "active",
            "last_message_at": now,
        },
    )
    conv.last_message_at = now
    conv.status = "active"
    if body.contact_name and not conv.contact_name:
        conv.contact_name = body.contact_name
    await conv.save()

    msg = await WhatsAppMessageOrm.create(
        id=uuid4(),
        conversation_id=conv.id,
        wamid=sent_wamid,
        direction="outbound",
        message_type="text",
        body=body.text,
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


@router.post("/conversations/{conversation_id}/reply", dependencies=_write_deps, status_code=status.HTTP_201_CREATED)
async def reply_to_conversation(
    conversation_id: UUID,
    body: ReplyIn,
) -> WhatsAppMessageOut:
    """Envoie un message texte au contact WhatsApp et persiste la réponse en BD."""
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm
    from app.infrastructure.whatsapp.client import get_wa, is_configured

    conv = await WhatsAppConversationOrm.get_or_none(id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

    if not is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp non configuré",
        )

    wa = get_wa()
    sent_wamid: str
    try:
        sent = await wa.send_message(to=conv.wa_id, text=body.text)
        sent_wamid = sent.id if hasattr(sent, "id") else f"out:{uuid4()}"
        delivery_status = "sent"
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Échec d'envoi WhatsApp : {exc}",
        ) from exc

    now = datetime.now(timezone.utc)
    msg = await WhatsAppMessageOrm.create(
        id=uuid4(),
        conversation_id=conv.id,
        wamid=sent_wamid,
        direction="outbound",
        message_type="text",
        body=body.text,
        meta_timestamp=now,
        delivery_status=delivery_status,
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
        media_filename=None,
        delivery_status=msg.delivery_status,
        error_message=None,
        meta_timestamp=msg.meta_timestamp,
        created_at=msg.created_at,
    )


class GenerateCRIn(BaseModel):
    extra_note_ids: list[UUID] = []   # notes existantes à combiner avec les messages


@router.post("/conversations/{conversation_id}/generate-cr", dependencies=_write_deps, status_code=status.HTTP_201_CREATED)
async def generate_cr_from_conversation(
    conversation_id: UUID,
    body: GenerateCRIn = GenerateCRIn(),
) -> dict:
    """Génère un compte rendu PDF depuis les messages WhatsApp de la conversation.

    Les messages sont traités comme des notes et passés au même outil de génération
    que les CR de prospection. Le CR est créé sans prospection (parent_type='whatsapp')
    et peut être associé à une prospection plus tard via PATCH /compte-rendus/{id}/link-prospect.

    On peut aussi passer des note_ids de notes existantes pour les combiner avec les messages.
    """
    from app.infrastructure.db.models.whatsapp import WhatsAppConversationOrm, WhatsAppMessageOrm
    from app.services.compte_rendu import CompteRenduService

    conv = await WhatsAppConversationOrm.get_or_none(id=conversation_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation non trouvée")

    messages = await WhatsAppMessageOrm.filter(
        conversation_id=conversation_id,
    ).order_by("meta_timestamp")

    if not messages:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Aucun message dans cette conversation")

    # Formater les messages comme des notes (même format que _format_notes_for_prompt)
    lines = [f"Conversation WhatsApp avec {conv.contact_name or conv.wa_id}\n"]
    for m in messages:
        who = "Client" if m.direction == "inbound" else "Nous"
        ts = m.meta_timestamp.strftime("%d/%m/%Y %H:%M") if m.meta_timestamp else ""
        if m.message_type == "text" and m.body:
            lines.append(f"[{ts}] {who}: {m.body}")
        else:
            lines.append(f"[{ts}] {who}: [{m.message_type.upper()} — media_id={m.media_id or '?'}]")

    content = "\n".join(lines)

    service = CompteRenduService()
    cr = await service.generate_from_raw_content(
        content=content,
        parent_type="whatsapp",
        parent_id=conversation_id,
        extra_note_ids=body.extra_note_ids or None,
    )

    return {
        "id": cr.id,
        "version": cr.version,
        "generation_status": cr.generation_status,
        "minio_path": cr.minio_path,
        "file_size": cr.file_size,
        "created_at": cr.created_at,
    }
