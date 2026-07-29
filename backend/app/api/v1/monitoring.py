"""Router /monitoring — métriques système et consommation IA.

Endpoints :
  GET /monitoring/stats            → snapshot instantané CPU/mémoire/réseau
  WS  /monitoring/stream           → flux temps réel toutes les 2 s
  GET /monitoring/ai/usage         → consommation tokens agrégée par provider
  GET /monitoring/ai/balance       → solde DeepSeek en temps réel

Auth : JWT Bearer pour HTTP ; ?token=<jwt> pour WebSocket.
"""
from __future__ import annotations

import json

import httpx
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect

from app.api.deps import require_permission
from app.api.v1.schemas.monitoring import AiBalanceResponse, AiUsageResponse, SystemSnapshot
from app.core.config import settings

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

_auth = [Depends(require_permission("app:read"))]


@router.get("/stats", dependencies=_auth)
async def get_stats() -> SystemSnapshot:
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


# ── Consommation IA ───────────────────────────────────────────────────────────

@router.get("/ai/usage", dependencies=_auth)
async def get_ai_usage(
    days: int = Query(30, ge=1, le=90, description="Période en jours (défaut 30)"),
) -> AiUsageResponse:
    """Consommation de tokens et coût estimé par provider sur les N derniers jours.

    Retourne une agrégation par provider + l'historique journalier.
    """
    from datetime import datetime, timedelta, timezone

    from tortoise.expressions import RawSQL
    from tortoise.functions import Count, Sum

    from app.infrastructure.db.models.ai_usage import AiUsageLogOrm

    since = datetime.now(timezone.utc) - timedelta(days=days)
    logs = await AiUsageLogOrm.filter(created_at__gte=since)

    # Agrégation par provider
    by_provider: dict[str, dict] = {}
    for log in logs:
        p = log.provider
        if p not in by_provider:
            by_provider[p] = {"calls": 0, "input_tokens": 0, "output_tokens": 0, "total_tokens": 0, "cost_usd": 0.0}
        by_provider[p]["calls"]         += 1
        by_provider[p]["input_tokens"]  += log.input_tokens
        by_provider[p]["output_tokens"] += log.output_tokens
        by_provider[p]["total_tokens"]  += log.total_tokens
        by_provider[p]["cost_usd"]      = round(by_provider[p]["cost_usd"] + log.cost_usd, 6)

    # Arrondi coûts
    for p in by_provider:
        by_provider[p]["cost_usd"] = round(by_provider[p]["cost_usd"], 4)

    # Historique journalier
    daily: dict[str, dict[str, dict]] = {}
    for log in logs:
        day = log.created_at.strftime("%Y-%m-%d")
        p   = log.provider
        daily.setdefault(day, {}).setdefault(p, {"calls": 0, "total_tokens": 0, "cost_usd": 0.0})
        daily[day][p]["calls"]        += 1
        daily[day][p]["total_tokens"] += log.total_tokens
        daily[day][p]["cost_usd"]      = round(daily[day][p]["cost_usd"] + log.cost_usd, 6)

    history = [
        {"day": day, "providers": providers}
        for day, providers in sorted(daily.items())
    ]

    total_cost  = round(sum(v["cost_usd"]    for v in by_provider.values()), 4)
    total_calls = sum(v["calls"]             for v in by_provider.values())
    total_tok   = sum(v["total_tokens"]      for v in by_provider.values())

    return {
        "period_days": days,
        "summary": {
            "total_calls":    total_calls,
            "total_tokens":   total_tok,
            "cost_usd":       total_cost,
        },
        "by_provider": by_provider,
        "history":     history,
    }


@router.get("/ai/balance", dependencies=_auth)
async def get_ai_balance() -> AiBalanceResponse:
    """Solde des crédits IA disponibles.

    - DeepSeek  : solde réel via API officielle
    - OpenAI    : coût trackés localement (API billing fermée aux clés API)
    - Anthropic : coût trackés localement (pas d'API de solde publique)
    """
    from datetime import datetime, timedelta, timezone
    from app.infrastructure.db.models.ai_usage import AiUsageLogOrm

    # Coûts trackés localement sur 30 jours pour OpenAI et Anthropic
    since = datetime.now(timezone.utc) - timedelta(days=30)
    logs = await AiUsageLogOrm.filter(created_at__gte=since)

    local_cost: dict[str, float] = {}
    for log in logs:
        local_cost[log.provider] = round(local_cost.get(log.provider, 0.0) + log.cost_usd, 6)

    result: dict[str, dict] = {
        "anthropic": {
            "available": None,
            "message": "Solde non disponible via API — coût estimé sur 30j ci-dessous",
            "local_cost_usd_30d": round(local_cost.get("anthropic", 0.0), 4),
        },
        "openai": {
            "available": None,
            "message": "API billing OpenAI fermée aux clés API — coût estimé sur 30j ci-dessous",
            "local_cost_usd_30d": round(local_cost.get("openai", 0.0), 4),
        },
        "deepseek": {"available": False, "message": "Clé API non configurée"},
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        # ── OpenAI Balance via session token navigateur ───────────────────────
        # Le session token (sess-...) s'obtient dans les DevTools de platform.openai.com
        if settings.openai_session_token:
            try:
                resp = await client.get(
                    "https://api.openai.com/dashboard/billing/credit_grants",
                    headers={
                        "Authorization": f"Bearer {settings.openai_session_token}",
                        "Content-Type": "application/json",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    result["openai"] = {
                        "available":       True,
                        "total_granted":   data.get("total_granted"),
                        "total_used":      data.get("total_used"),
                        "total_available": data.get("total_available"),
                        "local_cost_usd_30d": round(local_cost.get("openai", 0.0), 4),
                        "source": "dashboard/billing (session token)",
                    }
                elif resp.status_code == 401:
                    result["openai"]["message"] = "Session token expiré — renouveler OPENAI_SESSION_TOKEN dans .env"
                else:
                    result["openai"]["message"] = f"Erreur API OpenAI : HTTP {resp.status_code}"
            except Exception as exc:
                result["openai"]["message"] = f"Erreur réseau OpenAI : {exc}"

        # ── DeepSeek Balance (API officielle disponible) ──────────────────────
        if settings.deepseek_api_key:
            try:
                resp = await client.get(
                    "https://api.deepseek.com/user/balance",
                    headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    result["deepseek"] = {
                        "available":          data.get("is_available", False),
                        "balance_infos":      data.get("balance_infos", []),
                        "local_cost_usd_30d": round(local_cost.get("deepseek", 0.0), 4),
                    }
                else:
                    result["deepseek"] = {
                        "available": False,
                        "message": f"Erreur API DeepSeek : HTTP {resp.status_code}",
                    }
            except Exception as exc:
                result["deepseek"] = {"available": False, "message": f"Erreur réseau : {exc}"}

    return result
