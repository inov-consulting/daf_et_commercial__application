from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "uid_users_email_133a6f";
        ALTER TABLE "users" DROP COLUMN "last_name";
        ALTER TABLE "users" DROP COLUMN "first_name";
        ALTER TABLE "users" DROP COLUMN "email";"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "users" ADD "last_name" VARCHAR(128) NOT NULL DEFAULT '';
        ALTER TABLE "users" ADD "first_name" VARCHAR(128) NOT NULL DEFAULT '';
        ALTER TABLE "users" ADD "email" VARCHAR(255) NOT NULL UNIQUE;"""


MODELS_STATE = (
    "eJztmFtv2jAUgP8KylMndagFetE0TQLKVKYCUwvb1KqKTGzAamKnjtMWVfz32SbBxCQIyq"
    "2teIHkXGL7O76c41fLoxC5Qb5KPR+QYYt51rfcq0WAh8RDivYwZwHf1zop4KDrKnNH2WGk"
    "pKAbcAYcLhQ94AZIiCAKHIZ9jikRUhK6rhRSRxhi0teikODHENmc9hEfICYUd/dCjAlEL+"
    "Lj0av/YPcwcmGixxjKtpXc5kNfyTqd+sVPZSmb69oOdUOPaGt/yAeUTMzDEMO89JG6PiKI"
    "AY7g1DBkL6Mhx6Jxj4WAsxBNugq1AKIeCF0Jw/reC4kjGeRUS/Kn9MNaAo9DiUSLCZcsXk"
    "fjUekxK6klm6pelq8Piqdf1ChpwPtMKRURa6QcAQdjV8VVg3QYksO2AZ8FeiE0HHsoHWrS"
    "04ALI9d8/PAWyLFAU9YzLMYc43sbU0uMAbaIO4wiOIdxu96o3bTLjd9yJF4QPLoKUbldk5"
    "qCkg4N6cE4JFSsj/HKmXwk97fevszJ19xtq1kzAzexa99ask8g5NQm9NkGcGqyxdIYjLDU"
    "gQ19+MbAJj33gd1pYKPO67iq/5mIVgeApUcztjfiKGBtZt9bMW4eeLFdRPp8IF4LJydzAv"
    "enfK02PmFlRKMZqQpj3SgB0KEh4Wy4DMMpl/Vg3MICSIJcBGM2xAyE9rJz0fTbHkxrhYM3"
    "ifL46GgBmMIqE6fSJYFGHbWdkDFEnKUmZ5rvx5ylxQXAFjOxFk2oiPl2Wp5YJzydpHYw+I"
    "nuLsAv2gq3ia8v2/laOC6dlc6Lp6VzYaK6MpGczUFab7YNYj4QM0jMpHEdkAovO8lOdV4h"
    "594+zlUy7KnSJLBFOYSfUnbGCqUuAiSjSJn2M7h1heOmVvDkBF83s0qrdZXIqSr1trF4O4"
    "1KTWyWCqswwhzpiSlrv97DVNEiBV3gPDwDBu0ZDS3QLNtZlVfwTAkgoK8IyXHKUUVFcSdA"
    "LKNejlWH84rlUBjtC+V9obyvp95FPbUvlD9pYGcKZZ2IBLOB/XXTambVKAk3I6odIvjeQe"
    "zww5yLA36/sYJF74rdELsckyAvG9zQxih5JMIa59UHjfI/M+WuXrUqZrzkByr7TOgzZ0Jl"
    "xLAzSEuEIs3cPAhom3eTCGVWgotWgdGM2emN2VpqwOy850mkr7JLM/CybySmXD7mRcRG7h"
    "3l0lgCYmT+MQFu5JJMtMgRScnS5h3mE5ddHeQbu5JY25G90+Nl9B9NUM5i"
)
