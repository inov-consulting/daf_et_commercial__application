from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "compte_rendus" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_type" VARCHAR(20) NOT NULL,
    "parent_id" UUID NOT NULL,
    "version" INT NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'final',
    "minio_bucket" VARCHAR(100) NOT NULL DEFAULT 'documents',
    "minio_path" VARCHAR(500) NOT NULL,
    "file_size" INT,
    "generated_by" VARCHAR(20) NOT NULL,
    "prompt_used" TEXT,
    "note_ids" JSONB,
    "created_by_id" UUID REFERENCES "users" ("id") ON DELETE SET NULL,
    CONSTRAINT "uid_compte_rend_parent__f22c55" UNIQUE ("parent_type", "parent_id", "version")
);
CREATE INDEX IF NOT EXISTS "idx_compte_rend_parent__baa3cc" ON "compte_rendus" ("parent_id");
COMMENT ON TABLE "compte_rendus" IS 'Compte-rendu généré (PDF) lié à un prospect ou un service.';
        CREATE TABLE IF NOT EXISTS "notes" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "author_id" UUID REFERENCES "users" ("id") ON DELETE SET NULL,
    "prospect_id" UUID NOT NULL REFERENCES "prospects" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "notes" IS 'Notes textuelles liées à un prospect.';
        ALTER TABLE "ai_config" ADD "compte_rendu_template" TEXT;
        ALTER TABLE "prospects" ADD "erp_metadata" JSONB;
        ALTER TABLE "prospects" ALTER COLUMN "odoo_lead_id" DROP NOT NULL;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "ai_config" DROP COLUMN "compte_rendu_template";
        ALTER TABLE "prospects" DROP COLUMN "erp_metadata";
        ALTER TABLE "prospects" ALTER COLUMN "odoo_lead_id" SET NOT NULL;
        DROP TABLE IF EXISTS "compte_rendus";
        DROP TABLE IF EXISTS "notes";"""


MODELS_STATE = (
    "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"
)
