"""Broadcaster WebSocket in-memory pour les notifications utilisateurs.

Chaque utilisateur connecté à WS /notifications/stream reçoit
ses notifications en temps réel dès leur création.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# user_id (str) → liste de queues (une par onglet/device connecté)
_subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)


async def subscribe(user_id: str):
    """Générateur async — yield chaque nouvelle notification de l'utilisateur."""
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers[user_id].append(q)
    logger.debug("notif.ws.subscribe user_id=%s clients=%d", user_id, len(_subscribers[user_id]))
    try:
        while True:
            payload = await q.get()
            yield payload
    finally:
        try:
            _subscribers[user_id].remove(q)
        except ValueError:
            pass


async def publish_notification(user_id: str, payload: dict) -> None:
    """Publie une notification à tous les clients WebSocket de cet utilisateur."""
    targets = _subscribers.get(user_id, [])
    for q in targets:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            logger.warning("notif.ws.queue_full user_id=%s — notification dropped", user_id)
