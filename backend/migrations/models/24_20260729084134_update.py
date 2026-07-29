from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "ai_usage_logs" ADD "company_id" UUID;
        ALTER TABLE "commercial_predictions" ADD "company_id" UUID;
        ALTER TABLE "commercial_runs" ADD "company_id" UUID;
        ALTER TABLE "compte_rendus" ADD "company_id" UUID;
        ALTER TABLE "daf_agent_runs" ADD "company_id" UUID;
        ALTER TABLE "notifications" ADD "company_id" UUID;
        ALTER TABLE "prospects" ADD "company_id" UUID;
        ALTER TABLE "transport_offers" ADD "company_id" UUID;
        ALTER TABLE "whatsapp_conversations" ADD "company_id" UUID;
        CREATE INDEX IF NOT EXISTS "idx_ai_usage_lo_company_af635f" ON "ai_usage_logs" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_commercial__company_67ba05" ON "commercial_predictions" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_commercial__company_4311ca" ON "commercial_runs" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_compte_rend_company_045c47" ON "compte_rendus" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_daf_agent_r_company_7cab41" ON "daf_agent_runs" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_notificatio_company_b2c48f" ON "notifications" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_prospects_company_69e306" ON "prospects" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_transport_o_company_92d86c" ON "transport_offers" ("company_id");
        CREATE INDEX IF NOT EXISTS "idx_whatsapp_co_company_673a1c" ON "whatsapp_conversations" ("company_id");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "idx_whatsapp_co_company_673a1c";
        DROP INDEX IF EXISTS "idx_commercial__company_67ba05";
        DROP INDEX IF EXISTS "idx_transport_o_company_92d86c";
        DROP INDEX IF EXISTS "idx_commercial__company_4311ca";
        DROP INDEX IF EXISTS "idx_notificatio_company_b2c48f";
        DROP INDEX IF EXISTS "idx_daf_agent_r_company_7cab41";
        DROP INDEX IF EXISTS "idx_compte_rend_company_045c47";
        DROP INDEX IF EXISTS "idx_ai_usage_lo_company_af635f";
        DROP INDEX IF EXISTS "idx_prospects_company_69e306";
        ALTER TABLE "prospects" DROP COLUMN "company_id";
        ALTER TABLE "ai_usage_logs" DROP COLUMN "company_id";
        ALTER TABLE "compte_rendus" DROP COLUMN "company_id";
        ALTER TABLE "daf_agent_runs" DROP COLUMN "company_id";
        ALTER TABLE "notifications" DROP COLUMN "company_id";
        ALTER TABLE "commercial_runs" DROP COLUMN "company_id";
        ALTER TABLE "transport_offers" DROP COLUMN "company_id";
        ALTER TABLE "commercial_predictions" DROP COLUMN "company_id";
        ALTER TABLE "whatsapp_conversations" DROP COLUMN "company_id";"""


MODELS_STATE = (
    "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"
)
