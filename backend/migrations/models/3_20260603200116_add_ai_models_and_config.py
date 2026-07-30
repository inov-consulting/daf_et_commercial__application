from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "ai_models" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(128) NOT NULL UNIQUE,
    "provider" VARCHAR(32) NOT NULL,
    "is_embedding" BOOL NOT NULL DEFAULT False,
    "is_active" BOOL NOT NULL DEFAULT True
);
        CREATE TABLE IF NOT EXISTS "ai_config" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "default_model_id" UUID NOT NULL REFERENCES "ai_models" ("id") ON DELETE CASCADE
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "ai_models";
        DROP TABLE IF EXISTS "ai_config";"""


MODELS_STATE = (
    "eJztme9v2jgYx/8VlFc9qVd1oduq02lSoFTjNsqphd1p0xSZxIDVxM4cpx2q+N/PNklMEo"
    "eRtgHay5sNnh+N/Xkc+/maB8MnLvTCEwt1CZ6i2ZD6xh+tBwMDH/IPOvdxywBBoJzCwMDE"
    "k/EA2Y6MlGGTkFHgMO6YAi+E3OTC0KEoYIhgbsWR5wkjcXggwjNlijD6EUGbkRlkc0i549"
    "t3bkbYhT9hmHwNbu0pgp6bGTJyxbOl3WaLQNrG4/7FpYwUj5vwMXqRj1V0sGBzgtPwKELu"
    "icgRvhnEkAIG3bVpiFHGU05MqxFzA6MRTIfqKoMLpyDyBAzjz2mEHcGgJZ8k/jn7YFTAwx"
    "kLtAgzweJhuZqVmrO0GuJR3Y/W9VH73W9yliRkMyqdkoixlImAgVWq5KpAOhSKaduAFYFe"
    "cA9DPtRDzWbm4Lpx6kny4TGQE4OirFZYgjnB9zimBp+DO8TeIq7gBsaj/qB3M7IGf4uZ+G"
    "H4w5OIrFFPeExpXeSsR6uSEP5+rN6c9I+0/umPPrbE19bX4VUvX7g0bvTVEGMCESM2Jvc2"
    "cNcWW2JNwPBIVdgocB9Z2GxmU9i9FjYevKprTMiW+7JdbR/U5T7nrlh/XR+/CYqjZHqr3Q"
    "MzWIo8LwmFaIY/wYWk2ucDAtiBGnjpQToQH+Jz9GAhKqtaeRTcp6etdrnw2fIvkMn5dq2b"
    "rnXRMyTcCXBu7wF17Qxl4SEmyVnS2KLLN/28BWAwkyDEdMTgi5y17cx6FTZ2M8radDNNN9"
    "Mcevs+9Jpu5pUWttDNyP8LFe3OAdVXM4nP1ZHDqmffe2LdfPDT9iCesTn/+sY831C4L9a1"
    "3Ph4VK4aV7HLXPmWGYABJXfIhbQKxPWc5wG5g1cgg7JtbkGybZaCFK4sRxTa0J9A1xWDKL"
    "DsEOJBgEvO41xqDumE59bFtGqPsv0h3BkOP2e2kE5/lKM5HnR6fL1KyDwIrXrC/tWoiJZ3"
    "VOhO86L/iqvK2yHUdBM4MKYFBVPeda91RPKiLtSgjxMvP11DD8hZFjHrbwYPb3coUzTLOu"
    "VHl/gBwIsS+bHmPd4kPxwZh2AjPxr50XSpB9GlNvLjlRb2fy0/zLdvt2iaeVRp1yx92d7O"
    "IRFmdFGF4VrKyxQf22iPculRUB4xD7vqWszn7Q6m8YSDNyeJT0+3kcSnp+WSWPiyQJNray"
    "eiFGKn0uLU5b7MVdreRiGXC+Q8VEgD7Y9Nfcz0JFVCjp/ozn/NL94Kd4lvJp7zu/nm7P3Z"
    "efvd2TkPkUNJLe83IC3K3gDwFcRX0koHVPylTpv8hJ579zif0mE3dwd7vDuoUzKPQ0hL9H"
    "LiOt4kliMe1AjlRig3euog9FQjlF9pYQtCWTUimqvkv26GV2UaJZOWq+oYc77fXOSw45aH"
    "Qva9NsGidsVJhDyGcHgiHljTxih4ZMqa9NVHA+vffMvd/Tzs5Osl/kCn6YRecydkQYqcua"
    "4Rij0b+yCgYg6mESpVgtuqwHjF7PXG7Fk0YHnfc8fb1/iXtm1vJNZSXuZFRC33juLVqAAx"
    "Dn+ZAGu5JONPZBBrurRNh3masq+DvLYriWc7svd6vCz/A979r2U="
)
