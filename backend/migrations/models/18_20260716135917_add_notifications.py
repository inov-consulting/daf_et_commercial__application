from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "notification_type" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'unread',
    "read_at" TIMESTAMPTZ,
    "reference_type" VARCHAR(64),
    "reference_id" UUID,
    "data" JSONB
);
CREATE INDEX IF NOT EXISTS "idx_notificatio_user_id_daa173" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notificatio_notific_4c14ec" ON "notifications" ("notification_type");
CREATE INDEX IF NOT EXISTS "idx_notificatio_status_7f8af2" ON "notifications" ("status");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "notifications";"""


MODELS_STATE = (
    "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"
    "yFdIWk3RWjlkV5Fa/RdodxpJ/cf/A4Gk0h0="
)
