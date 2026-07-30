from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "kpi_group_access" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" VARCHAR(100) NOT NULL UNIQUE,
    "group_name" VARCHAR(255) NOT NULL DEFAULT '',
    "kpi_keys" JSONB NOT NULL
);
COMMENT ON COLUMN "kpi_group_access"."group_id" IS 'ID du groupe Keycloak';
COMMENT ON COLUMN "kpi_group_access"."group_name" IS 'Nom lisible du groupe (dénormalisé)';
COMMENT ON COLUMN "kpi_group_access"."kpi_keys" IS 'Liste des clés KPI accessibles';
COMMENT ON TABLE "kpi_group_access" IS 'Mapping groupe Keycloak ↔ liste de clés KPI autorisées.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "kpi_group_access";"""


MODELS_STATE = (
    "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"
)
