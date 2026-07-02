from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "app_config" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validators_data" JSONB NOT NULL,
    "smtp_data" JSONB NOT NULL
);
COMMENT ON TABLE "app_config" IS 'Singleton de configuration applicative.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "app_config";"""


MODELS_STATE = (
    "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"
)
