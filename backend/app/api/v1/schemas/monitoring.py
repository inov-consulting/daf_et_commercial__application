"""Schémas Pydantic pour les endpoints /monitoring."""
from __future__ import annotations

from pydantic import BaseModel


# ── /monitoring/stats ─────────────────────────────────────────────────────────

class CpuMetric(BaseModel):
    percent: float
    count: int
    status: str  # "ok" | "warning" | "critical"


class MemoryMetric(BaseModel):
    total_mb: int
    used_mb: int
    available_mb: int
    percent: float
    status: str


class NetworkMetric(BaseModel):
    send_rate_kbps: float
    recv_rate_kbps: float
    bytes_sent_total: int
    bytes_recv_total: int
    status: str


class SystemSnapshot(BaseModel):
    timestamp: str
    status: str  # statut global "ok" | "warning" | "critical"
    cpu: CpuMetric
    memory: MemoryMetric
    network: NetworkMetric


# ── /monitoring/ai/usage ──────────────────────────────────────────────────────

class ProviderUsage(BaseModel):
    calls: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float


class DailyProviderUsage(BaseModel):
    calls: int
    total_tokens: int
    cost_usd: float


class DailyEntry(BaseModel):
    day: str
    providers: dict[str, DailyProviderUsage]


class UsageSummary(BaseModel):
    total_calls: int
    total_tokens: int
    cost_usd: float


class AiUsageResponse(BaseModel):
    period_days: int
    summary: UsageSummary
    by_provider: dict[str, ProviderUsage]
    history: list[DailyEntry]


# ── /monitoring/ai/balance ────────────────────────────────────────────────────

class ProviderBalance(BaseModel):
    available: bool | None = None
    message: str | None = None
    balance_infos: list[dict] | None = None


class AiBalanceResponse(BaseModel):
    anthropic: ProviderBalance
    openai: ProviderBalance
    deepseek: ProviderBalance
