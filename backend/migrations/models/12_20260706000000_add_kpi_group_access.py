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
    "kpi_keys" JSONB NOT NULL DEFAULT '[]'
);
COMMENT ON TABLE "kpi_group_access" IS 'Mapping groupe Keycloak ↔ liste de clés KPI autorisées.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "kpi_group_access";"""
