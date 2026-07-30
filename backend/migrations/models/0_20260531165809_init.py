from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "companies" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "country" VARCHAR(2) NOT NULL,
    "country_name" VARCHAR(100) NOT NULL DEFAULT '',
    "default_currency" VARCHAR(3) NOT NULL,
    "odoo_id" INT,
    "parent_company_id" UUID,
    "is_active" BOOL NOT NULL DEFAULT True
);
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_ids" JSONB NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "first_name" VARCHAR(128) NOT NULL DEFAULT '',
    "last_name" VARCHAR(128) NOT NULL DEFAULT '',
    "is_active" BOOL NOT NULL DEFAULT True
);
CREATE INDEX IF NOT EXISTS "idx_users_email_133a6f" ON "users" ("email");
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "eJztmP1P4jAYx/8Vsp+8hCMKqORyuQSQi1wELgp3F41ZylagcWvn1qnE8L9fW/ZaNsJ4Fb"
    "NflD0va/t52q7fvism0aHhlJrEtACe9mxT+VZ4VzAwIfuR4C0WFGBZoY8bKBgaIlwTcQgK"
    "Kxg61AYaZY4RMBzITDp0NBtZFBHMrNg1DG4kGgtEeByaXIyeXahSMoZ0Am3meHhkZoR1+M"
    "Ze7j1aT+oIQUOP9RjpvG1hV+nUErbBoH31U0Ty5oaqRgzXxGG0NaUTgoNw10V6iedw3xhi"
    "aAMK9cgweC+9IfumeY+ZgdouDLqqhwYdjoBrcBjK95GLNc6gIFrif6o/lAx4NII5WoQpZ/"
    "E+m48qHLOwKryp5nX99qRy8UWMkjh0bAunIKLMRCKgYJ4quIYgNRvyYauALgK9Yh6KTJgM"
    "NZ4pwdW91JL/Yx3IviGkHM4wH7OPbz2mChuD3sPG1KvgEsb9dqd11693fvORmI7zbAhE9X"
    "6Le8rCOpWsJ/OSELY+5isneEnhb7t/XeCPhftetyUXLojr3yu8T8ClRMXkVQV6ZLL5Vh8M"
    "iwwL61r6moWNZ+aFPWhhvc6HdRX/FyranAA7uZp+vFRHBms3+96GdTPBm2pAPKYT9lg+P1"
    "9SuD/1W7HxsSipGl3PVZ77ZjGAGnExtadZGEZStoNxDwsgDnIVjOkQUxCqWeeinLc/mMoG"
    "H944yrPT0xVgsqhUnMIXB+p1VNVc24ZYyzQ5k3KPc5ZWVgBbScVakaESnRA16aDYxjQZZS"
    "RDIsg6vAJBbzPcJ8Axb+dr+ax6Wa1VLqo1FiK6Elgul0Btd/sSMwuwOcTm0lwJJNJLP2Yn"
    "Jm9w6t4/zk3O2BFx4qhMEKGXhL2xQYgBAU6RKdE8iduQJe5qDQff8G0za/R6N7FTVaPdl5"
    "bvoNNose1SYGVBiMJwYnL1N3qKyBZuGALt6RXYurrgIWWSFrvoMsumbAEYjAUhPk4+Kk8W"
    "Dxxopyhm31VcJpddFpRL5Vwq54rqQyiqXCp/0sIuSOXwIOIsFvbXXa+bplJiaVJVB5jxfd"
    "CRRosFAzn0cWeSJdwVhy4yKMJOiTe4o42R84iV1T9Zn3Tq/+RDd/Om15DrxV/QkE5C0ATI"
    "yCJmgoT8usJDOEK2QzMr7XjWUerscm0VnV2upets7ovDNMAaLGNJOcpc5HxGkVOHNtImSo"
    "LG8TzFZRIHhDEfRuOk3vKsesHjzZiDfl+2cr2TLmlemDLlXcqwG0ZSjvOWcSdfab40MkD0"
    "wo8T4E5uwFmLFOIEAbbsnB6kHOqMvrPbxq2dxg/6eZn9B/qWB8w="
)
