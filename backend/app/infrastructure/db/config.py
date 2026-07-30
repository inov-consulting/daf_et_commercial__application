import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.example", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_database_url: str


def get_tortoise_database_url() -> str:
    database_url = os.getenv("APP_DATABASE_URL") or DatabaseSettings().app_database_url
    if not database_url:
        raise RuntimeError("APP_DATABASE_URL is required to configure Tortoise ORM")
    # Tortoise attend "postgres://" ou "asyncpg://", pas "postgresql://"
    return database_url.replace("postgresql+asyncpg://", "postgres://", 1).replace("postgresql://", "postgres://", 1)


TORTOISE_ORM = {
    "connections": {
        "default": get_tortoise_database_url(),
    },
    "apps": {
        "models": {
            "models": ["app.infrastructure.db.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}
