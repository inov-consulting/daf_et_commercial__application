from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "ai_config" ADD "default_embedding_model_id" UUID NOT NULL;
        ALTER TABLE "ai_config" ADD CONSTRAINT "fk_ai_confi_ai_model_4edb3dfa" FOREIGN KEY ("default_embedding_model_id") REFERENCES "ai_models" ("id") ON DELETE CASCADE;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "ai_config" DROP CONSTRAINT IF EXISTS "fk_ai_confi_ai_model_4edb3dfa";
        ALTER TABLE "ai_config" DROP COLUMN "default_embedding_model_id";"""


MODELS_STATE = (
    "eJztmf9vmzgUwP+ViJ96Uq/qkm6rTtNJJE213JZmapPdadOEHHCIVTDMmHZR1f/9bIcvwR"
    "gWmpCkLb+04X0B+/OM/d7jQXM9CzrBiY56Hp4he0Rc7a/Wg4aBC9kPlfq4pQHfT5VcQMHU"
    "EfYAGaawFGbTgBJgUqaYASeATGTBwCTIp8jDTIpDx+FCz2SGCNupKMToZwgN6tmQziFhiu"
    "8/mBhhC/6CQXzp3xozBB0rM2Rk8WcLuUEXvpBNJoOLS2HJHzdlY3RCF6fW/oLOPZyYhyGy"
    "TrgP19kQQwIotFamwUcZTTkWLUfMBJSEMBmqlQosOAOhw2FoH2YhNjmDlngS/3P2t1YBD2"
    "PM0SJMOYuHx+Ws0jkLqcYf1fuoXx913v0hZukF1CZCKYhoj8IRULB0FVxTkCaBfNoGoHmg"
    "F0xDkQvVULOeElwrcj2JfzwFcixIKacrLMYc43saU43NwRphZxFFsITxeDDs34z14Rc+Ez"
    "cIfjoCkT7uc01bSBeS9GgZEo+9H8s3J7lJ69/B+GOLX7a+ja76cuASu/E3jY8JhNQzsHdv"
    "AGtlscXSGAyzTAMb+tYTA5v1bAK718BGg0/jGhEyoDuFlsUYGGKHNqrtiOV32eZOWX+sN9"
    "kY81w3ofkaGfIjenarPFsyWPI8Lz0CkY0/wYWgOmADAtiECnhJgjLkP6L85GAhptL0jSbg"
    "PslilMuFzZZdQCrm29NvevpFX1vnxW+45riqNzU1Yb58p8C8vQfEMjLrmGu8tidJEtu8ym"
    "27sgRgYAskfGJ8GnniykR8NR6leXgqbfLwJg9v0rV9p2tNHv5CA5vLw8X/XER7c0DU0Yzt"
    "pTgyWPXsexvGzQW/DAdim87Z5Zv2eUngvurXYuNjVlI0riJVe6nLJtw+8e6QBUkViKs+2w"
    "G5g1cgg7LTXoNkp10IkquyHFGQJjx5ll3PcyDABeex5CohnTLfuphWzVHWP4S7o9HnzBbS"
    "HYwlmpNht8/Wq4DMjNAyJxxcjfNoWUaF7hQv+u+4pn47hJpsAgfGNFcjFmfdKxmRaDGXL+"
    "7oFpefrqEDxHzzwNXd7cPbJ4qqnMyKjKFEw49m/Bqp1Fme9TzXB3hRUJ6taI/LyjNT2CHY"
    "lGdNedZk8QeRxTfl2QsN7Ksuz9pv365RVDCrwqpC6B6lTCPElCyqMFxxeZ7F2Tq1WXFplq"
    "vMIh5G1bUo++0OprbBwSu1DE5P12kZnJ4Wtwy4Tv2NzgwJgdistDhVvs9zlXbW6SAUNxBk"
    "qJD4ys+dA0zVJFMHiR/Pzn/PL9oKd4nP5s/5s/3m7P3Zeefd2TkzEUNJJO9LkObbAj5gK4"
    "itpGUdUPFbsdJ5g5x79zi387296a3svLdSZ8k8CSApqJdj1XFZsRwyo6ZQbgrlpp46iHqq"
    "KZRfaGAVHeU4EQnygf3nZnRVVKNk3KSoTjDj+91CJj1uOSigP2orWNJdcRoihyIcnPAH1r"
    "Qxch6ZsMZ59dFQ/09OuXufR105XvwG3SYTesmZkA4JMueqRCjSlOZBILU5mESosBJctwqM"
    "VsxeO2ZbqQGL8547lr4qv8YVdyRWXJ5nI6KWviN/NSpAjMyfJ8BammTsiRRiRZZWdpgnLv"
    "s6yGtrSWztyN7r8fL4P5tK+7g="
)
