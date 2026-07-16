"""Router /monitoring — métriques système en temps réel.

Endpoints :
  GET /monitoring/stats          → snapshot instantané (HTTP)
  WS  /monitoring/stream         → flux continu toutes les 2 s (WebSocket)

Auth : token JWT en query param pour le WebSocket (ws:// ne supporte pas les headers).
Les deux endpoints nécessitent la permission app:read.
"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.api.deps import require_permission

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

_auth = [Depends(require_permission("app:read"))]


@router.get("/stats", dependencies=_auth)
async def get_stats() -> dict:
    """Retourne un snapshot instantané des métriques CPU, mémoire et réseau."""
    from app.infrastructure.monitoring.collector import collect
    return collect()


@router.websocket("/stream")
async def monitoring_stream(websocket: WebSocket, token: str | None = Query(None)):
    """WebSocket — reçoit un snapshot système toutes les 2 secondes.

    Connexion : ws://.../api/v1/monitoring/stream?token=<jwt>

    Format reçu :
    {
      "timestamp": "...",
      "status": "ok" | "warning" | "critical",
      "cpu":     { "percent": 12.4, "count": 4, "status": "ok" },
      "memory":  { "total_mb": 8192, "used_mb": 3200, "available_mb": 4992,
                   "percent": 39.1, "status": "ok" },
      "network": { "send_rate_kbps": 128.5, "recv_rate_kbps": 512.3,
                   "bytes_sent_total": ..., "bytes_recv_total": ...,
                   "status": "ok" }
    }
    """
    from app.infrastructure.auth.keycloak import KeycloakClient
    from app.infrastructure.monitoring.collector import subscribe

    # Auth via query param (WebSocket ne supporte pas les headers Authorization)
    if token:
        try:
            kc = KeycloakClient()
            payload = await kc.introspect_token(token)
            if not payload:
                await websocket.close(code=4001)
                return
        except Exception:
            await websocket.close(code=4001)
            return
    else:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    try:
        async for snapshot in subscribe():
            await websocket.send_text(json.dumps(snapshot))
    except WebSocketDisconnect:
        pass
