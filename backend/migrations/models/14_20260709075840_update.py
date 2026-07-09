from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "daf_agent_runs" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "summary" TEXT,
    "error" TEXT
);
COMMENT ON TABLE "daf_agent_runs" IS 'Représente un cycle d''exécution de l''agent DAF.';
        CREATE TABLE IF NOT EXISTS "daf_agent_events" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" VARCHAR(30) NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "run_id" UUID NOT NULL REFERENCES "daf_agent_runs" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "daf_agent_events" IS 'Log granulaire d''un événement au sein d''un cycle.';
        CREATE TABLE IF NOT EXISTS "daf_financial_snapshots" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_label" VARCHAR(50) NOT NULL,
    "total_receivables" DECIMAL(18,2),
    "overdue_receivables" DECIMAL(18,2),
    "overdue_receivables_count" INT,
    "total_payables" DECIMAL(18,2),
    "overdue_payables" DECIMAL(18,2),
    "overdue_payables_count" INT,
    "dso_days" DOUBLE PRECISION,
    "cash_position" DECIMAL(18,2),
    "raw_data" JSONB,
    "snapshot_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "run_id" UUID NOT NULL REFERENCES "daf_agent_runs" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "daf_financial_snapshots" IS 'Photographie des indicateurs financiers calculés lors d''un cycle.';
        CREATE TABLE IF NOT EXISTS "daf_proposed_actions" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "target_data" JSONB,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'medium',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "proposed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ,
    "executed_at" TIMESTAMPTZ,
    "decided_by" UUID,
    "execution_result" JSONB,
    "execution_error" TEXT,
    "run_id" UUID NOT NULL REFERENCES "daf_agent_runs" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "daf_proposed_actions" IS 'Proposition d''action générée par l''agent, soumise à validation humaine.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "daf_agent_events";
        DROP TABLE IF EXISTS "daf_agent_runs";
        DROP TABLE IF EXISTS "daf_proposed_actions";
        DROP TABLE IF EXISTS "daf_financial_snapshots";"""


MODELS_STATE = (
    "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"
    "J2kIlVvo1ZnMVVvobcxc3qv1o+ufXv76P61l89c="
)
