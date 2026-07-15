from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Catalogue des modèles supportés → provider associé
AI_MODEL_PROVIDERS: dict[str, Literal["anthropic", "openai", "groq"]] = {
    # Anthropic — Claude
    "claude-opus-4-7": "anthropic",
    "claude-opus-4-5": "anthropic",
    "claude-sonnet-4-6": "anthropic",
    "claude-sonnet-4-5": "anthropic",
    "claude-haiku-4-5": "anthropic",
    # OpenAI — GPT
    "gpt-4o": "openai",
    "gpt-4o-mini": "openai",
    "gpt-4-turbo": "openai",
    "o1": "openai",
    "o1-mini": "openai",
    # Groq — gratuit, idéal pour les tests
    "llama-3.3-70b-versatile": "groq",
    "llama-3.1-8b-instant":    "groq",
    "mixtral-8x7b-32768":      "groq",
    "gemma2-9b-it":            "groq",
}


class Settings(BaseSettings):
    """Configuration applicative.

    Toutes les variables sont chargées depuis l'environnement (ou .env en dev).
    Pas de valeur par défaut sensible — la prod doit fournir explicitement chaque secret.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Projet ─────────────────────────────────────────────────────────
    environment: Literal["development", "staging", "production"] = "development"

    # ── Backend ────────────────────────────────────────────────────────
    backend_host: str = "0.0.0.0"
    backend_log_level: str = "INFO"
    backend_cors_origins: str = "http://localhost:3100"
    secret_key: str = Field(..., min_length=16)
    jwt_access_minutes: int = 15
    jwt_refresh_days: int = 30
    # Tolérance clock skew entre backend et Keycloak (en secondes).
    # Augmenter si les serveurs sont dans des fuseaux horaires différents
    # et que NTP n'est pas parfaitement synchronisé (60s est la valeur standard).
    jwt_leeway_seconds: int = 60

    # ── Database ───────────────────────────────────────────────────────
    app_database_url: str

    # ── Redis / Celery ─────────────────────────────────────────────────
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str

    # ── MinIO / S3 ─────────────────────────────────────────────────────
    minio_url: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "portalis"
    minio_public_base_url: str = ""

    # ── Keycloak ───────────────────────────────────────────────────────
    keycloak_url: str = ""
    keycloak_realm: str = ""
    keycloak_client_id: str = ""
    keycloak_client_secret: str = ""
    keycloak_admin_client_id: str = ""
    keycloak_admin_client_secret: str = ""

    # ── IA ─────────────────────────────────────────────────────────────
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    groq_api_key: str = ""
    # Modèle par défaut pour l'agent. Le provider est déduit automatiquement
    # depuis AI_MODEL_PROVIDERS. Exemples : claude-opus-4-7, gpt-4o-mini
    ai_default_model: str = "gpt-4o-mini"
    # Résolu automatiquement — ne pas définir dans .env
    ai_provider: Literal["anthropic", "openai", "groq"] = "openai"

    @model_validator(mode="after")
    def resolve_ai_provider(self) -> "Settings":
        provider = AI_MODEL_PROVIDERS.get(self.ai_default_model)
        if provider is None:
            known = ", ".join(AI_MODEL_PROVIDERS)
            raise ValueError(
                f"Modèle IA inconnu : '{self.ai_default_model}'. "
                f"Modèles supportés : {known}"
            )
        self.ai_provider = provider
        return self

    # ── Odoo ───────────────────────────────────────────────────────────
    odoo_url: str = ""
    odoo_db: str = ""
    odoo_username: str = ""
    odoo_password: str = ""
    odoo_api_key: str = ""

    # ── WhatsApp Business Cloud API ────────────────────────────────────
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""       # Phone Number ID (pas le numéro lui-même)
    whatsapp_business_account_id: str = ""   # WhatsApp Business Account ID
    whatsapp_webhook_verify_token: str = ""  # Token secret inventé par toi, copié dans Meta
    api_domain: str = ""                     # Domaine public de l'API (sans slash final)
    # ex dev  : https://abc123.ngrok-free.app
    # ex prod : https://portalis.mondomaine.com

    # ── Observability ──────────────────────────────────────────────────
    sentry_dsn: str = ""
    bugsnag_api_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
