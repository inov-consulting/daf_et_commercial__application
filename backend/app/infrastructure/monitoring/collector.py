"""Collecteur de métriques système + broadcaster WebSocket.

Métriques collectées :
  - CPU : utilisation globale (%) + statut ok/warning/critical
  - Mémoire : utilisée / disponible / % + statut
  - Réseau : débits send/recv en KB/s + statut

Seuils :
  CPU     ok < 60 %     warning 60-80 %   critical > 80 %
  Mémoire ok < 70 %     warning 70-85 %   critical > 85 %
  Réseau  ok < 10 MB/s  warning 10-50 MB  critical > 50 MB/s

En Docker, CPU et mémoire reflètent l'hôte (monté via /proc).
Le réseau reflète l'interface du container (trafic propre au service).
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

import psutil

logger = logging.getLogger(__name__)

# ── Abonnés WebSocket ─────────────────────────────────────────────────────────

_subscribers: list[asyncio.Queue] = []

# ── État réseau précédent (pour calcul du débit) ──────────────────────────────

_prev_net: psutil._common.snetio | None = None  # type: ignore[name-defined]
_prev_net_time: float | None = None

# ── Seuils ────────────────────────────────────────────────────────────────────

def _cpu_status(pct: float) -> str:
    if pct >= 80:
        return "critical"
    if pct >= 60:
        return "warning"
    return "ok"


def _mem_status(pct: float) -> str:
    if pct >= 85:
        return "critical"
    if pct >= 70:
        return "warning"
    return "ok"


def _net_status(max_bytes_per_sec: float) -> str:
    mbs = max_bytes_per_sec / (1024 * 1024)
    if mbs >= 50:
        return "critical"
    if mbs >= 10:
        return "warning"
    return "ok"


def _overall_status(*statuses: str) -> str:
    if "critical" in statuses:
        return "critical"
    if "warning" in statuses:
        return "warning"
    return "ok"


# ── Collecte ──────────────────────────────────────────────────────────────────

def collect() -> dict:
    """Collecte un snapshot instantané des métriques système."""
    global _prev_net, _prev_net_time

    cpu_pct = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    net = psutil.net_io_counters()
    now = time.monotonic()

    # Débit réseau (delta depuis la dernière lecture)
    send_rate = recv_rate = 0.0
    if _prev_net is not None and _prev_net_time is not None:
        elapsed = now - _prev_net_time
        if elapsed > 0:
            send_rate = (net.bytes_sent - _prev_net.bytes_sent) / elapsed
            recv_rate = (net.bytes_recv - _prev_net.bytes_recv) / elapsed

    _prev_net = net
    _prev_net_time = now

    cpu_s = _cpu_status(cpu_pct)
    mem_s = _mem_status(mem.percent)
    net_s = _net_status(max(send_rate, recv_rate))

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": _overall_status(cpu_s, mem_s, net_s),
        "cpu": {
            "percent": round(cpu_pct, 1),
            "count": psutil.cpu_count(logical=True),
            "status": cpu_s,
        },
        "memory": {
            "total_mb": round(mem.total / 1024 ** 2),
            "used_mb": round(mem.used / 1024 ** 2),
            "available_mb": round(mem.available / 1024 ** 2),
            "percent": round(mem.percent, 1),
            "status": mem_s,
        },
        "network": {
            "send_rate_kbps": round(send_rate / 1024, 1),
            "recv_rate_kbps": round(recv_rate / 1024, 1),
            "bytes_sent_total": net.bytes_sent,
            "bytes_recv_total": net.bytes_recv,
            "status": net_s,
        },
    }


# ── Broadcaster WebSocket ─────────────────────────────────────────────────────

async def subscribe():
    """Générateur async — yield chaque snapshot au client WebSocket connecté."""
    q: asyncio.Queue = asyncio.Queue(maxsize=20)
    _subscribers.append(q)
    logger.debug("monitoring.ws.subscribe clients=%d", len(_subscribers))
    try:
        while True:
            payload = await q.get()
            yield payload
    finally:
        try:
            _subscribers.remove(q)
        except ValueError:
            pass


async def _broadcast(payload: dict) -> None:
    for q in list(_subscribers):
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass


# ── Boucle de collecte en arrière-plan ───────────────────────────────────────

async def start_monitoring_loop(interval: float = 2.0) -> None:
    """Lance la collecte périodique et diffuse aux clients WebSocket connectés.

    Args:
        interval: Secondes entre deux collectes (défaut 2 s).
    """
    # Premier appel à cpu_percent pour initialiser la baseline (toujours 0.0 sinon)
    psutil.cpu_percent(interval=None)
    psutil.net_io_counters()  # initialise aussi l'état réseau
    await asyncio.sleep(0.5)

    logger.info("monitoring.loop.started interval=%.1fs", interval)
    while True:
        try:
            snapshot = collect()
            if _subscribers:
                await _broadcast(snapshot)
        except Exception:
            logger.exception("monitoring.loop.error")
        await asyncio.sleep(interval)
