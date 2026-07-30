from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "transport_offers" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" UUID NOT NULL,
    "user_id" UUID,
    "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
    "collected_data" JSONB NOT NULL,
    "document_markdown" TEXT,
    "document_generated_at" TIMESTAMPTZ,
    "odoo_shipment_id" INT,
    "odoo_shipment_name" VARCHAR(64),
    "confirmed_at" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "idx_transport_o_session_4c6a6c" ON "transport_offers" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_transport_o_user_id_4036d1" ON "transport_offers" ("user_id");
COMMENT ON TABLE "transport_offers" IS 'Offre commerciale transport générée par conversation IA.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "transport_offers";"""


MODELS_STATE = (
    "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"
)
