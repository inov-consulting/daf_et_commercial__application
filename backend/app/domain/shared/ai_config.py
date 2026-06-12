"""Entités IA : catalogue de modèles + configuration active."""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal
from uuid import UUID

Provider = Literal["anthropic", "openai", "groq"]


@dataclass(slots=True, kw_only=True)
class AiModel:
    """Un modèle IA disponible dans le catalogue."""

    id: UUID
    name: str                          # ex: "claude-opus-4-7"
    provider: Provider                 # "anthropic" | "openai"
    is_embedding: bool = False         # True = modèle d'embedding
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(slots=True, kw_only=True)
class AiConfig:
    """Configuration active : modèle de génération + modèle d'embedding."""

    id: UUID
    default_model_id: UUID           # modèle de génération (ex: claude-opus-4-7)
    default_embedding_model_id: UUID  # modèle d'embedding (ex: text-embedding-3-large)
    compte_rendu_template: str | None = None  # Template Claude pour génération CR
    created_at: datetime | None = None
    updated_at: datetime | None = None


# Catalogue initial chargé au premier démarrage (seed)
INITIAL_MODELS: list[dict[str, object]] = [
    # ── Anthropic ─────────────────────────────────────────────────────
    {"name": "claude-opus-4-7",    "provider": "anthropic", "is_embedding": False},
    {"name": "claude-opus-4-5",    "provider": "anthropic", "is_embedding": False},
    {"name": "claude-sonnet-4-6",  "provider": "anthropic", "is_embedding": False},
    {"name": "claude-sonnet-4-5",  "provider": "anthropic", "is_embedding": False},
    {"name": "claude-haiku-4-5",   "provider": "anthropic", "is_embedding": False},
    # ── OpenAI — Génération ───────────────────────────────────────────
    {"name": "gpt-4o",             "provider": "openai",    "is_embedding": False},
    {"name": "gpt-4o-mini",        "provider": "openai",    "is_embedding": False},
    {"name": "gpt-4-turbo",        "provider": "openai",    "is_embedding": False},
    {"name": "o1",                 "provider": "openai",    "is_embedding": False},
    {"name": "o1-mini",            "provider": "openai",    "is_embedding": False},
    # ── OpenAI — Embedding ────────────────────────────────────────────
    {"name": "text-embedding-3-large", "provider": "openai", "is_embedding": True},
    {"name": "text-embedding-3-small", "provider": "openai", "is_embedding": True},
    # ── Groq — Génération (gratuit, idéal pour les tests) ─────────────
    {"name": "llama-3.3-70b-versatile", "provider": "groq", "is_embedding": False},
    {"name": "llama-3.1-8b-instant",    "provider": "groq", "is_embedding": False},
    {"name": "mixtral-8x7b-32768",      "provider": "groq", "is_embedding": False},
    {"name": "gemma2-9b-it",            "provider": "groq", "is_embedding": False},
]

DEFAULT_MODEL_NAME = "gpt-4o-mini"
DEFAULT_EMBEDDING_MODEL_NAME = "text-embedding-3-large"
