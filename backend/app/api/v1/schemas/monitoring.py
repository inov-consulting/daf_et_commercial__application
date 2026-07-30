"""Schémas Pydantic pour les endpoints /monitoring."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

StatusLevel = Literal["ok", "warning", "critical"]


# ── /monitoring/stats ─────────────────────────────────────────────────────────

class CpuMetric(BaseModel):
    percent: float = Field(..., description="Utilisation CPU globale en %")
    count: int = Field(..., description="Nombre de cœurs logiques")
    status: StatusLevel = Field(..., description="ok < 60 % | warning 60-80 % | critical > 80 %")


class MemoryMetric(BaseModel):
    total_mb: int = Field(..., description="RAM totale (Mo)")
    used_mb: int = Field(..., description="RAM utilisée (Mo)")
    available_mb: int = Field(..., description="RAM disponible (Mo)")
    percent: float = Field(..., description="Utilisation mémoire en %")
    status: StatusLevel = Field(..., description="ok < 70 % | warning 70-85 % | critical > 85 %")


class NetworkMetric(BaseModel):
    send_rate_kbps: float = Field(..., description="Débit sortant instantané (Ko/s)")
    recv_rate_kbps: float = Field(..., description="Débit entrant instantané (Ko/s)")
    bytes_sent_total: int = Field(..., description="Octets envoyés depuis le démarrage du container")
    bytes_recv_total: int = Field(..., description="Octets reçus depuis le démarrage du container")
    status: StatusLevel = Field(..., description="ok < 10 MB/s | warning 10-50 MB/s | critical > 50 MB/s")


class SystemSnapshot(BaseModel):
    timestamp: str = Field(..., description="Horodatage ISO 8601 UTC du snapshot")
    status: StatusLevel = Field(..., description="Statut global (pire des trois métriques)")
    cpu: CpuMetric
    memory: MemoryMetric
    network: NetworkMetric


# ── /monitoring/ai/usage ──────────────────────────────────────────────────────

class ProviderUsage(BaseModel):
    calls: int = Field(..., description="Nombre d'appels IA sur la période")
    input_tokens: int = Field(..., description="Tokens d'entrée consommés")
    output_tokens: int = Field(..., description="Tokens de sortie générés")
    total_tokens: int = Field(..., description="Total tokens (input + output)")
    cost_usd: float = Field(..., description="Coût estimé en USD")


class DailyProviderUsage(BaseModel):
    calls: int = Field(..., description="Appels ce jour")
    total_tokens: int = Field(..., description="Tokens consommés ce jour")
    cost_usd: float = Field(..., description="Coût estimé ce jour (USD)")


class DailyEntry(BaseModel):
    day: str = Field(..., description="Date au format YYYY-MM-DD")
    providers: dict[str, DailyProviderUsage] = Field(
        ...,
        description="Consommation par provider ce jour (clé = nom du provider)",
    )


class UsageSummary(BaseModel):
    total_calls: int = Field(..., description="Total d'appels IA sur la période")
    total_tokens: int = Field(..., description="Total de tokens consommés")
    cost_usd: float = Field(..., description="Coût total estimé en USD")


class AiUsageResponse(BaseModel):
    period_days: int = Field(..., description="Durée de la période analysée (jours)")
    summary: UsageSummary = Field(..., description="Totaux consolidés toutes IA confondues")
    by_provider: dict[str, ProviderUsage] = Field(
        ...,
        description="Détail par provider IA (anthropic, openai, deepseek, groq…)",
    )
    history: list[DailyEntry] = Field(
        ...,
        description="Historique journalier — un item par jour, trié par date croissante",
    )


# ── /monitoring/ai/balance ────────────────────────────────────────────────────

class DeepSeekBalanceInfo(BaseModel):
    """Une ligne de solde retournée par l'API DeepSeek (peut exister en plusieurs devises)."""
    currency: str = Field(..., description="Devise (ex. CNY, USD)")
    total_balance: str = Field(..., description="Solde total (crédits offerts + rechargés)")
    granted_balance: str = Field(..., description="Crédits offerts restants")
    topped_up_balance: str = Field(..., description="Crédits rechargés restants")


class OpenAiBalanceFunds(BaseModel):
    """Une ligne de solde retournée par l'Admin API OpenAI."""
    object: str | None = None
    amount: float | None = None
    currency: str | None = None


class ProviderBalance(BaseModel):
    model_config = {"extra": "allow"}

    # Champ commun — état disponible (bool pour DeepSeek, None si inconnu)
    available: bool | list[OpenAiBalanceFunds] | None = Field(
        None,
        description="True/False (DeepSeek) ou liste de soldes (OpenAI Admin API)",
    )
    message: str | None = Field(None, description="Message d'erreur ou d'information")

    # DeepSeek
    balance_infos: list[DeepSeekBalanceInfo] | None = Field(
        None,
        description="Détail du solde par devise (DeepSeek)",
    )

    # OpenAI Admin API (organization/balance)
    pending: list[OpenAiBalanceFunds] | None = Field(None, description="Solde en attente (OpenAI Admin API)")
    source: str | None = Field(None, description="Endpoint source utilisé")

    # OpenAI legacy (dashboard/billing/credit_grants)
    total_granted: float | None = Field(None, description="Crédits offerts totaux (OpenAI legacy)")
    total_used: float | None = Field(None, description="Crédits consommés (OpenAI legacy)")
    total_available: float | None = Field(None, description="Crédits restants (OpenAI legacy)")

    # Tracking local (tous providers)
    local_cost_usd_30d: float | None = Field(
        None,
        description="Coût estimé en USD sur les 30 derniers jours (depuis ai_usage_logs)",
    )


class AiBalanceResponse(BaseModel):
    anthropic: ProviderBalance = Field(..., description="Solde Anthropic (suivi local uniquement)")
    openai: ProviderBalance = Field(..., description="Solde OpenAI (suivi local uniquement)")
    deepseek: ProviderBalance = Field(..., description="Solde DeepSeek via API officielle")
