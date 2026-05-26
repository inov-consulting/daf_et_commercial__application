"""Configuration Tortoise ORM."""

from tortoise import Tortoise

from app.infrastructure.db.config import TORTOISE_ORM


async def init_db() -> None:
    await Tortoise.init(config=TORTOISE_ORM)


async def close_db() -> None:
    await Tortoise.close_connections()
