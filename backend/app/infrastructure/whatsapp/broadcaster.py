"""Broadcaster SSE in-memory pour les messages WhatsApp temps réel.

Chaque client connecté à GET /whatsapp/conversations/{id}/stream reçoit
les nouveaux messages dès leur arrivée via le webhook, sans polling.

Limitation : fonctionne uniquement sur une instance unique du serveur.
Pour multi-instances, remplacer par Redis pub/sub.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# conversation_id (str) → liste de queues (une par client connecté)
_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)

# Queue globale pour les nouvelles conversations (liste des conversations)
_conversation_subscribers: list[asyncio.Queue] = []


async def subscribe_conversation(conversation_id: str):
    """Générateur async — yield chaque nouveau message de la conversation."""
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers[conversation_id].append(q)
    logger.debug("sse.subscribe conversation_id=%s clients=%d", conversation_id, len(_subscribers[conversation_id]))
    try:
        while True:
            data = await q.get()
            yield data
    finally:
        try:
            _subscribers[conversation_id].remove(q)
        except ValueError:
            pass
        logger.debug("sse.unsubscribe conversation_id=%s", conversation_id)


async def subscribe_all():
    """Générateur async — yield les événements de toutes les conversations (liste globale)."""
    q: asyncio.Queue = asyncio.Queue(maxsize=100)
    _conversation_subscribers.append(q)
    try:
        while True:
            data = await q.get()
            yield data
    finally:
        try:
            _conversation_subscribers.remove(q)
        except ValueError:
            pass


async def publish_message(conversation_id: str, message_data: dict) -> None:
    """Publie un nouveau message à tous les clients abonnés à cette conversation."""
    targets = _subscribers.get(str(conversation_id), [])
    for q in targets:
        try:
            q.put_nowait({"event": "message", "data": message_data})
        except asyncio.QueueFull:
            logger.warning("sse.queue_full conversation_id=%s — message dropped", conversation_id)

    # Publier aussi dans le flux global (pour rafraîchir la liste des conversations)
    global_payload = {
        "event": "new_message",
        "data": {
            "conversation_id": str(conversation_id),
            **{k: v for k, v in message_data.items() if k in ("direction", "message_type", "body", "contact_name")},
        },
    }
    for q in _conversation_subscribers:
        try:
            q.put_nowait(global_payload)
        except asyncio.QueueFull:
            pass
