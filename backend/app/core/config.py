from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # ── Database ───────────────────────────────────────────────────────
    app_database_url: str

    # ── Redis / Celery ─────────────────────────────────────────────────
    redis_url: str
    celery_broker_url: str
    celery_result_backend: str

    # ── MinIO / S3 ─────────────────────────────────────────────────────
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin"

    # ── IA ─────────────────────────────────────────────────────────────
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-7"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    ai_default_provider: Literal["anthropic", "openai"] = "anthropic"

    # ── Observability ──────────────────────────────────────────────────
    sentry_dsn: str = ""

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
