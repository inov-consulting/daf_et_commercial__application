"""Script d'initialisation de la base de données (création des tables)."""

import asyncio

from tortoise import Tortoise

from app.infrastructure.db.config import TORTOISE_ORM


async def main() -> None:
    await Tortoise.init(config=TORTOISE_ORM)
    print("Generating schemas...")
    await Tortoise.generate_schemas()
    print("Done.")
    await Tortoise.close_connections()


if __name__ == "__main__":
    asyncio.run(main())
