from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "commercial_predictions" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partner_id" INT NOT NULL,
    "partner_name" VARCHAR(255) NOT NULL,
    "prediction_summary" TEXT NOT NULL,
    "suggested_action" TEXT NOT NULL,
    "opportunity_type" VARCHAR(50) NOT NULL DEFAULT 'opportunite',
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "predicted_revenue" DOUBLE PRECISION,
    "data_sources" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "validated_by" UUID,
    "validated_at" TIMESTAMPTZ,
    "rejected_by" UUID,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "prospect_id" UUID,
    "odoo_lead_id" INT
);
CREATE INDEX IF NOT EXISTS "idx_commercial__partner_c9474b" ON "commercial_predictions" ("partner_id");
COMMENT ON COLUMN "commercial_predictions"."partner_id" IS 'ID res.partner Odoo';
COMMENT ON COLUMN "commercial_predictions"."prediction_summary" IS 'Analyse complète en Markdown';
COMMENT ON COLUMN "commercial_predictions"."suggested_action" IS 'Action commerciale recommandée';
COMMENT ON COLUMN "commercial_predictions"."opportunity_type" IS 'renouvellement | upsell | nouveau_besoin | opportunite';
COMMENT ON COLUMN "commercial_predictions"."confidence_score" IS 'Score de confiance 0.0 → 1.0';
COMMENT ON COLUMN "commercial_predictions"."predicted_revenue" IS 'CA estimé en devise locale';
COMMENT ON COLUMN "commercial_predictions"."data_sources" IS 'Quelles données ont été utilisées (web, transport_history, shipments)';
COMMENT ON COLUMN "commercial_predictions"."status" IS 'pending | validated | rejected';
COMMENT ON COLUMN "commercial_predictions"."prospect_id" IS 'UUID ProspectOrm créé après validation';
COMMENT ON COLUMN "commercial_predictions"."odoo_lead_id" IS 'ID crm.lead Odoo créé après validation';
COMMENT ON TABLE "commercial_predictions" IS 'Prédiction commerciale IA en attente de validation humaine.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "commercial_predictions";"""


MODELS_STATE = (
    "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"
    "VndS//H/41Dv7A=="
)
