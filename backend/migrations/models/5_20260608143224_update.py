from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "users" ADD "avatar_url" VARCHAR(1024);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "users" DROP COLUMN "avatar_url";"""


MODELS_STATE = (
    "eJztWm1v2joY/Sson3qlruoC26ppuhJQqrGNMrWwe7VpikxiwGriZI7TDlX977NNXojjZK"
    "EQoG2+bOR5Sezz2M45T3qvOa4Fbf+kjbounqLZkDja+8a9hoED2Q+V+7ihAc9LnNxAwcQW"
    "8QAZpogUYROfEmBS5pgC24fMZEHfJMijyMXMigPb5kbXZIEIzxJTgNGvABrUnUE6h4Q5fv"
    "xkZoQt+Bv60aV3Y0wRtK3UkJHFny3sBl14wjYe988vRCR/3ISN0Q4cnER7Czp3cRweBMg6"
    "4TncN4MYEkChtTINPspwypFpOWJmoCSA8VCtxGDBKQhsDob2YRpgk2PQEE/i/7T+1daAh2"
    "HMoUWYcizuH5azSuYsrBp/VPdj++qo+fYfMUvXpzMinAIR7UEkAgqWqQLXBEiTQD5tA9As"
    "oOfMQ5ED1aCmMyVwrTD1JPrxGJAjQ4JyssIimCP4HoepxuZgDbG9CCtYgPGoP+hdj9qDr3"
    "wmju//sgVE7VGPe3RhXUjWo2VJXLY/ljsnvknjv/7oY4NfNr4PL3ty4eK40XeNjwkE1DWw"
    "e2cAa2WxRdYIGBaZFDbwrEcWNp1ZF3avhQ0Hn9Q1RMiAzgRaFsPAECe0sd6JWHyXbZ6U1d"
    "d6k4Mxi+smaL5EDPkrenqjfLekYMnieeESiGb4M1wIVPtsQACbUAFeTFAG/EfITw4WxMSa"
    "7GgC7mIWo1wubLbsAlIx3277uts+72llNn6NawZX9aGmRpgv3wkwb+4AsYzUOuYeV3clSx"
    "ybdTm6I1sABjMBCZ8Yn0YWcSURX61HIQ9PrDUPr3l4Tdf2TddqHv5MC5vh4eL/TEW7c0DU"
    "1YzipToysKo59zasmwN+GzbEMzpnl6/1s4LCfWtfiYOPRUnVuAxd+tKXJtwecW+RBck6IK"
    "7mbAfIHWyBFJRNvQSSTT0XSO5K44j8hPBksey4rg0BznkfS6kSpBOWWxWm63KU8i/hznD4"
    "JXWEdPojCc3xoNNj61WAzILQkhP2L0dZaBmjQreKjf43XJO8HYIaHwIHhmlGI+az7hVGJF"
    "rMxYs7vMXF5ytoAzHfLODq7vbhnRN5Kie1IiNQwuGHM36JqFQpz7qu4wG8yJFnK97jInlm"
    "ijgEa3lWy7OaxR8Ei6/l2TMt7IuWZ/qbNyVEBYvKVRXC9yAxjQBTslgHw5WUpynOymizfG"
    "mWUWYhHsa6a1HO2x2Y2gYvXqllcHpapmVweprfMuA+9Tc6MyAEYnOtxanKfZqrtFmmg5Df"
    "QJBBhcRTfu7sY6pGMkmQ8OPs/O/4hUfhLuGb8ee80l+33rXOmm9bZyxEDCW2vCuANNsW8A"
    "BbQWwlLXXAmt+KlckbcO7dw7md7+11b2XnvZUqJfPYhyRHL0eu4yKxHLCgWijXQrnWUweh"
    "p2qh/EwLq+goR0TEzxb20/XwMk+jpNKkqo4xw/eHhUx63LCRT39WJliSU3ESIJsi7J/wB1"
    "Z0MHI8UmWNePXRoP2/TLm7X4YduV78Bp2aCVX+5Q7cshcUMQKi+Pu4fI2YznqUOtyDupF0"
    "t94qJbz1VoHy5s6DoZZtSJA5VzHL0FNILEESczDMMldal5XV4SrbawtyK6I6n0jeMj2g/L"
    "yZv31XUp5mZ6eSRi7fGuucgcvwpwlgJV1H9kQKsYL2FrGjOGVfzKiyHs/WONBeXy8PfwAC"
    "ZGcd"
)
