from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
    "id" UUID NOT NULL PRIMARY KEY,
    "wa_id" VARCHAR(50) NOT NULL,
    "contact_name" VARCHAR(200),
    "phone_number_id" VARCHAR(50) NOT NULL,
    "display_phone_number" VARCHAR(30),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "last_message_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE "whatsapp_conversations" IS 'Une conversation = un contact (numéro WhatsApp) avec le business.';
        CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
    "id" UUID NOT NULL PRIMARY KEY,
    "wamid" VARCHAR(500) NOT NULL UNIQUE,
    "direction" VARCHAR(10) NOT NULL,
    "message_type" VARCHAR(20) NOT NULL,
    "body" TEXT,
    "media_id" VARCHAR(300),
    "media_mime_type" VARCHAR(100),
    "media_filename" VARCHAR(300),
    "meta_timestamp" TIMESTAMPTZ,
    "delivery_status" VARCHAR(20),
    "error_code" INT,
    "error_message" VARCHAR(500),
    "raw_payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversation_id" UUID NOT NULL REFERENCES "whatsapp_conversations" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "whatsapp_messages" IS 'Un message WhatsApp — entrant (client→business) ou sortant (business→client).';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "whatsapp_conversations";
        DROP TABLE IF EXISTS "whatsapp_messages";"""


MODELS_STATE = (
    "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"
)
