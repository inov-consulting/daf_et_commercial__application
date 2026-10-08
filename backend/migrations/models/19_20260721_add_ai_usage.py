from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
            "id"            UUID        NOT NULL PRIMARY KEY,
            "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "provider"      VARCHAR(32) NOT NULL,
            "model"         VARCHAR(64) NOT NULL,
            "context"       VARCHAR(64) NOT NULL DEFAULT 'unknown',
            "input_tokens"  INT         NOT NULL DEFAULT 0,
            "output_tokens" INT         NOT NULL DEFAULT 0,
            "total_tokens"  INT         NOT NULL DEFAULT 0,
            "cost_usd"      DOUBLE PRECISION NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS "idx_ai_usage_provider"   ON "ai_usage_logs" ("provider");
        CREATE INDEX IF NOT EXISTS "idx_ai_usage_model"      ON "ai_usage_logs" ("model");
        CREATE INDEX IF NOT EXISTS "idx_ai_usage_created_at" ON "ai_usage_logs" ("created_at");
    """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "ai_usage_logs";
    """
