"""Modèle ORM pour le tracking de la consommation des API IA."""
from __future__ import annotations

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class AiUsageLogOrm(BaseModel):
    """Enregistre chaque appel LLM avec tokens consommés et coût estimé.

    Alimenté automatiquement par UsageTrackerCallback (LangChain)
    et track_anthropic_sdk_usage (SDK direct).
    """

    provider: str = fields.CharField(max_length=32, index=True)   # anthropic | openai | groq | deepseek
    model: str    = fields.CharField(max_length=64, index=True)
    context: str  = fields.CharField(max_length=64, default="unknown")  # chat | daf | cr | offer | whatsapp

    input_tokens:  int   = fields.IntField(default=0)
    output_tokens: int   = fields.IntField(default=0)
    total_tokens:  int   = fields.IntField(default=0)
    cost_usd:      float = fields.FloatField(default=0.0)  # estimation basée sur la grille tarifaire

    class Meta:
        table = "ai_usage_logs"
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        return (
            f"<AiUsageLog {self.provider}/{self.model} "
            f"in={self.input_tokens} out={self.output_tokens} "
            f"${self.cost_usd:.6f}>"
        )
