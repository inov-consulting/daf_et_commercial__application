from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "companies" RENAME COLUMN "odoo_id" TO "erp_id";"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "companies" RENAME COLUMN "erp_id" TO "odoo_id";"""


MODELS_STATE = (
    "eJztmP1P4jAYx/8Vsp+8hCM6UMnlcgkgF7kIXBTuLhqzlK1A49bOrlOJ4X+/tuyFjY0wXs"
    "XsF2XPy9p+nrbrt++KRQxoOqUGsWyAJ11qKd8K7woGFuQ/ErzFggJsO/QJAwMDU4brMg5B"
    "aQUDh1GgM+4YAtOB3GRAR6fIZohgbsWuaQoj0XkgwqPQ5GL07EKNkRFkY0i54+GRmxE24B"
    "t/ufdoP2lDBE0j0mNkiLalXWMTW9r6/dbVTxkpmhtoOjFdC4fR9oSNCQ7CXRcZJZEjfCOI"
    "IQUMGnPDEL30huybZj3mBkZdGHTVCA0GHALXFDCU70MX64JBQbYk/lR+KBnw6AQLtAgzwe"
    "J9OhtVOGZpVURTjeva7Un54oscJXHYiEqnJKJMZSJgYJYquYYgdQrFsDXAFoFecQ9DFkyG"
    "Gs2MwTW81JL/Yx3IviGkHM4wH7OPbz2mCh+D0cXmxKvgEsa9Vrt516u1f4uRWI7zbEpEtV"
    "5TeFRpncSsJ7OSEL4+ZisneEnhb6t3XRCPhftupxkvXBDXu1dEn4DLiIbJqwaMucnmW30w"
    "PDIsrGsbaxY2mpkX9qCF9Tof1lX+X6hoYwxocjX9+FgdOazd7Hsb1s0Cb5oJ8YiN+aN6fr"
    "6kcH9qt3Lj41GxanQ8lzrzTSMAdeJiRidZGM6lbAfjHhZAFOQqGNMhpiDUss7FeN7+YCob"
    "fHijKM9OT1eAyaNScUpfFKjXUU13KYVYzzQ5k3KPc5aWVwBbTsVajkOF1NaSzoktzJJJhg"
    "kxfry7K/DztsJ94huJdr6qZ5XLSrV8UanyENmVwHK5BGmr04sRswGfQXwmzXRAIrz0Q3Zi"
    "8gZn7v3j3OSEPSdNHI3LIfSSsDPWCTEhwCkiZT4vxm3AE3e1goMv+LaZ1bvdm8iZqt7qxR"
    "Zvv11v8s1SYuVBiMFwYgrtN3yaEy3CMAD60yughrbgISpJi110WaoVtwAMRpKQGKcYlSeK"
    "+w6kKXrZdxWXiWWXB+VCORfKuZ76EHoqF8qftLALQjk8iDiLhf111+2kaZRIWqyqfcz5Ph"
    "hIZ8WCiRz2uDPBEu6KAxeZDGGnJBrc0cYoeETK6p+rT9q1f/Ejd+OmW4/XS7ygHj+AWwCZ"
    "WaRMkJBfVngIh4g6LLPOjmYdpcpWq6uobLWarrKFLwrTBGuwjCTlKHOR8xlFTg1SpI+VBI"
    "3jeYrLJA4IYz6Mxkm95Fn1gsebMQf9vmzleidd0rxwZSq6lGE3nEs5zjvGnXylxdLIANEL"
    "P06AO7n/5i0yiBME2LJzepByqDP6zm4bt3YaP+jnZfoffYAG+A=="
)
