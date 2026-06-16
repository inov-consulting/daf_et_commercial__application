from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "compte_rendus" ADD "content" TEXT;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "compte_rendus" DROP COLUMN "content";"""


MODELS_STATE = (
    "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"
    "6+/QNTItBl"
)
