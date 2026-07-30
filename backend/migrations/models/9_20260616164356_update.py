from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "api_request_logs" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "query_params" JSONB,
    "request_body" TEXT,
    "request_headers" JSONB,
    "user_id" UUID,
    "user_email" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "status_code" INT,
    "response_body" TEXT,
    "response_size_bytes" INT,
    "duration_ms" INT,
    "error_message" TEXT,
    "is_error" BOOL NOT NULL DEFAULT False,
    "tags" JSONB
);
CREATE INDEX IF NOT EXISTS "idx_api_request_user_id_1b7c16" ON "api_request_logs" ("user_id");
COMMENT ON TABLE "api_request_logs" IS 'Log d''une requête API avec sa réponse.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "api_request_logs";"""


MODELS_STATE = (
    "eJztXWtz27gV/SsYfUky43UdxdlNO53OKI7Tddevcex2Z5MMByIhCQ0JckHQiZrJfy8Akq"
    "KIB03KkqwHvlgWgAsSB6977r2AvveiOEBhejjAJzEZ4fEVjXp/A997BEaI/2PKPgA9mCRV"
    "pkhgcBjK8hB7viwpiw1TRqHPeMYIhiniSQFKfYoThmPCU0kWhiIx9nlBTMZVUkbwnxnyWD"
    "xGbIIoz/j4mSdjEqBvKC2/Jl+8EUZhUHtlHIhny3SPTROZdnd39u69LCkeN+TvGGYRqUon"
    "UzaJyax4luHgUMiIvDEiiEKGgrlmiLcsmlwm5W/MExjN0OxVgyohQCOYhQKM3t9HGfEFBk"
    "A+Sfw5/kevAzwcYwEtJkxg8f1H3qqqzTK1Jx518uvg5vmrn1/IVsYpG1OZKRHp/ZCCkMFc"
    "VOJaAelTJJrtQaYD+o7nMBwhM6h1SQXcoBA9LP9ZBOQyoUK5GmElzCV8i2Ha420Irkg4LX"
    "qwAePbs4vTD7eDi2vRkihN/wwlRIPbU5HTl6lTJfV53iUxnx/5zJlVAv5zdvsrEF/BH1eX"
    "p2rHzcrd/tET7wQzFnsk/urBYG6wlaklMLxk1bFZEizYsXVJ17FP2rHFy89N2DhKGPIoIk"
    "HmMRQlIQde7+Jb9I1Z5q2tAqWnOZwt+rZ44zV2bVNXnv5+W+vFy38PbuTieDH4/UWtJ8+v"
    "Lv9ZFq+68fLk/OqtXDErwIv39lA0REHA38yTW6LXbQtqrmWZW9OT9sCDO5GO62PQ3EcMhU"
    "40+mLczGuw6Hi+jynCY/IbmkpUz/gLQeKb5v5MI7wQ/xQK4caCWKVWCxKFX2dqo3G48Nby"
    "L4jJ9p4MPpwM3p322kx8h6uGq3lRMyMshu8Q+l++Qhp4tXEscuJ+rKTMyupZUT9SUyCBYw"
    "mJaJhoho64kfnM90cj8alSHfFxxMfpx0+tHzvis6MdqxEf+an16MkEUnNvluUXojULrHuP"
    "7LcIfvNCRMZswr++7L9p6LiS1PBSSm+UfKef59UV7oTG9zhAtAuI8zLLAXINU6AG5at+Cy"
    "Rf9a1Aiqw6jjitFB4dy7dxHCJILPuxIqpAOuSyq8K0q47SfhN+e3V1XltC3p6ptPru4u0p"
    "H68SZF4I5zrh2eWtDi3XqPC9YaI/hGslt0ZQZ4vAhmGqcUS71j1vWRI2/ebBXVTx/rcbFE"
    "LZXh1wszth89YJG8tRzG05KMXrFy3eR1RWSs8SfIN4C1N2HlvdU2qZg0aqlmCP5sW9MB63"
    "Y2w9XjMInmUEASH7KTs6Eqo+GFyfAXiPfJBCQGXqXxOODzrsKZB2ruAT+USuEY0QAyECAR"
    "pm4zGv6gCEz2AWYAZExjMOWzhNRX4KeJN5W0WN8umOSi5pxXVUct8Zh6OSO9qx2qbOl9tJ"
    "bFj97DyokthOFvTyqA2fPLLTySONTUJecQcEy/Lbid/rozYA8lJWBGVeHULeFDr1EkhhlO"
    "pQ/uvD1aUZSlVOgfSO8KZ+DLDPuBqBU/Z529y4ouXNblzVY6usEKIC1Y1bKoPDOJh2cZer"
    "cs5LbvSSlzBN+J6BaKfhbBB1I7rFiM5SRDv6zedEHqHJPwztko2jywk4kI1HEcQGF65936"
    "pLbcnsr29e/devW2xevJR185J5iqkuEfoWR9sw1+1o1qW2Es3jNmAe27E81qCUQwzyZhto"
    "hn1jqkttCZTr3pZSBlmWctQCg0n5jFigVaQUbHGO+MZhy9+If/zUf3n8y/GbVz8fv+FF5K"
    "vMUn5pgF83xvNZKo1UC6hMiqAbnBadqcApxf/jYE0ZMqyl1kFqkd7TwRpkuXXeM1EpK4aK"
    "1J5ihyiNqRfxTZlvJ10muiboJrpxogu3r4BqAW9xKeY8xXVIGRx3IplleccsD8zMsoPLeJ"
    "WewJM4SiCZWnyAc7kHTd4/X5bDyAVqOu+ac8JshBPGedd2tGP3OlBzJaY1P84IowbKbcdw"
    "TmQ7HWxtojTtQZpajGaBh9d1LKpy6wOz94iNV/X1tnP2Nnl7NV9ledTHzyhFxO80OE2y2z"
    "lKX7WJJbaHEqugIpoYHThWe0UlsKemigTyEcRHUs4DOnq/jMIr9YOtkQh2cIS5KOu1R1mv"
    "mjIzdCPO8zfQ5rkSBw9R5/J6gJZRs3n1P0kRMM7DW0n+UQS7gufX796/ACEuvsqPI5ARkN"
    "A4TZDPQJyJrymi99g3BNau4Bki9vYDi/0vCIQoBVEux2AQk6JmnsqfdnJzCM4RGGF/ghEF"
    "/CkApQykGQUXmJxd2eJwP5YLjpwjB7P1J1937hFNBX6fnUFhJcudMyjsOO90BoUd7VjNoK"
    "Aso+0jTuur71Yyjn4bLte3U7m+IXB3bhfqqDqv46aVjYwdK3drDTIrVZuTWIirLTTyXj5i"
    "2C2ZqeUxNF3mayWxRqvLCBMYLs30svzZGmGCY2+YcS3VsKs1HFhQ5NYIKQcti5DAZ1mwrs"
    "SilSPU9RhDXWo795SVHGYY4TAPReqwRtZk9tSiNWugN+xkVFXltnMorkC9ocJS4GUpMig4"
    "9lAmRcwFMhkDmfjjWccw5TkRB6oRVBIzxDXrTuFM8zIupEnR302HZUrTzbCr00AT3BOHgW"
    "bcNmGpA9n5LsS7FNF2l2E8GXoP3oOojZHa1YcfTm/B5d35+VPdfXjJ1wqLY6DMOmjyCIi1"
    "pqUnQNSXAsY3gwyFwqheWuP5v7o9Xrfyd5QXFnyuIfHhADKG+WLHeyGjIEEZA/C/ccYQ/x"
    "JmKeapKZDtkGb7eh3nCOSbVCbt+oiAC0i/BPFXXiqW1Yn7ORgVbgIwimkEGQfa3b7hzPmb"
    "oE7vitXXmfN3tGNNV2qtm0Q8Qf+tm0VwxCdx1/PgNaE9UWwVY4HUArp6Q+pi7ub5GSJLIA"
    "TXRVVbd0OeygqUUfLwhfP5bHScKtCWpo3iU+UAHYhYOMxsZ5VMxQ6aeNZsvMBcou3xpd4t"
    "V2JCTIr7AXPhnDalf8k/74uAKST9MhoH0njYo2sUzOxG/raMz9kVjQ6LSqaHFCUxZTmzCp"
    "9NcMpiKgYfuObJkHM4wMcEosQRLEewNmG13xk93BGsHe1YjWCVa23niClNcFvIlurfbuXe"
    "bvBu66dfqtfS8LTTVkXM+b+MzDVBVFhVLQ6FBhamyDn+6vir469r5q9PS8EeoF6tKVdboi"
    "XkOMnBxMcJDHN6NKtjxmAMfKqloHIkxZ/AKKlOpojTJ2mSf/HxSAwY4dUStKsgZ5KLBZCk"
    "4CqIY17de4hZeeP8qDgug/jwLb1pgpqFXA8C9xiCmMt44hvvcce+HPvagLVqZ5R0x752tG"
    "M19jW/iuo9a42FVcWWEg678ssw9vPQAImzewSzR+wVK4+CLTQKL+UKhsmn0HBsShfdEuK6"
    "hkMDM3BmQVGtA4w1yS1Bdd3mgPLy3Qkk44W2R2MFS9glNwv6DdoUy2Y3qjtNQaNtom/31M"
    "ITwpR56ZT4C0wEVdbNgSeeA+L6nggxKMie3pn2aH9VzkX8K52zwCWm9fMXhq28y686zsVR"
    "bx7Vstn7TD4j/FgkLFEPW4TKKu2WZWCOwWY5F7Njt1eK33xwd9o6o56z/WyE7ccZ9Xa0Yw"
    "0x6+WdgZ2OaSpiS9DbFjNYVaviMMMhwyQ9FA9c0cK4kgOc7tLC5VxaWFP67vkGRb2MdvpF"
    "tLrUllixVNtg/7iVcbB/3GAdFJkLcg7tlsXFNW79cseNA78VA1krDdsgDFbJNwaIYn/SM9"
    "CNIuegiW3AqszG0A2r/6yt16zo+cfRjE3wmtnZhfWyMvuabr+tbEtiPldyEb+YGl02xrz4"
    "dgK4EneZ9ahnk8psO+q5NnV5p+ycy99efvwfM5vNwg=="
)
