from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "prospects" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "odoo_lead_id" INT NOT NULL UNIQUE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'nouveau',
    "portalis_sector" VARCHAR(100),
    "portalis_notes" TEXT,
    "status_changed_at" TIMESTAMPTZ,
    "created_by" UUID,
    "last_sync_at" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "idx_prospects_odoo_le_4eb88c" ON "prospects" ("odoo_lead_id");
COMMENT ON TABLE "prospects" IS 'Table principale des prospects Portalis.';
        CREATE TABLE IF NOT EXISTS "prospect_activities" (
    "id" UUID NOT NULL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "performed_by" UUID,
    "prospect_id" UUID NOT NULL REFERENCES "prospects" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "prospect_activities" IS 'Timeline des activités/événements sur un prospect.';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "prospects";
        DROP TABLE IF EXISTS "prospect_activities";"""


MODELS_STATE = (
    "eJztXGtv2zYU/SuCvqwFMs9VkrYbhgGOm6xZk7hInK3oAwIt0TYRiVQpyq1R5L+PpF6WRK"
    "mSYzu2oy+xdckrkeeS1DmXdH7oLrGh43d6qE/wGE0G1NX/0H7oGLiQf1EVH2g68Ly0UBgY"
    "GDmyPkCmJWvKaiOfUWAxXjAGjg+5yYa+RZHHEMHcigPHEUZi8YoIT1JTgNHXAJqMTCCbQs"
    "oLPn3hZoRt+B368aV3Z44RdOxMk5Etni3tJpt70nZ7e/7mTNYUjxvxNjqBi9Pa3pxNCU6q"
    "BwGyO8JHlE0ghhQwaC90Q7Qy6nJsClvMDYwGMGmqnRpsOAaBI8DQ/xwH2BIYaPJJ4s/RX3"
    "oDeDjGAlqEmcDix33Yq7TP0qqLR/Xf9q6fHb58LntJfDahslAiot9LR8BA6CpxTYG0KBTd"
    "NgErAvqGlzDkQjWoWc8cuHbk2om/LANybEhRTkdYDHMM33KY6rwP9gA78yiCFRgPzy9Pb4"
    "a9y/eiJ67vf3UkRL3hqSgxpHWesz4LQ0L4/AhnTnIT7b/z4VtNXGofB1en+cAl9YYfddEm"
    "EDBiYvLNBPbCYIutMTC8ZhrYwLOXDGzWsw3sowY2anwa1wghE7ojaNscA1Ou0GazFbH6Lq"
    "tcKdcf64csjEVcH4LmU8RQvKLHd8p3SwaWIp5nhEI0we/gXKJ6zhsEsAUV4CUE5VJ8ifjJ"
    "1oKYWtMZTcG3hMUohwvvLb+ATPa337vp996c6nUmfotrAVf1oqZGWAzfEbDuvgFqm5lxLE"
    "qIQXKWpG6xyDXcvAVgMJGQiI6JbhQRVxLxxXhU8vDU2vLwloe3dO2x6VrLw/c0sAUeLj8L"
    "Ee1PAVVHM66fiyMHaz3r3gPj5oLvpgPxhE355QvjdUXg/u1dy4WP18pF4yoqMsKyLOH2KJ"
    "khG9ImIC76rAbIDUyBDJSHRg0kD41SIEVRFkfkp4SniOUJIQ4EuOR9nHPNQTrivuvCtClH"
    "qf8SPhkMLjJLyMn5MIfm7eXJKR+vEmReCYWc8PxqWISWMyo0U0z0n+Ga+m0Q1GQR2DJMCx"
    "qxnHUvMCKZYq4e3NEtzt5dQwfI/hYBV2e3t2+dKFM5mREZgxI1P+rxU0RlnfKsT1wP4HmJ"
    "PFsoPaiSZ5ash2Arz1p51rL4rWDxrTzb08A+aXlmHB/XEBW8VqmqkGX3OaYRYEbnTTBccN"
    "lNcVZHm5VLs4Iyi/Awm47FvN/mwNQf8OLNpQy63Topg263PGUgytR7dFZAKcRWo8Gp8t3N"
    "UXpYJ4NQnkDIgwqpp9zuPMdMjWTqkMNPsPOf4xcthZuEbyKe86vx4ujV0evDl0eveRXZlM"
    "TyqgLSYlrAA3wE8ZEU6oCGe8VK5wdw7s3DuZr99ja3svHcyjol83tKfA9arCdig1iZdlZV"
    "O6gS0V7kEAYdsbpyWh9y0u0gDDVu1yLnz0G3C3/3fws/Z+EHhi6fkL7mB1QLsBY/sKPnAv"
    "vwO37Gn/E1dD0HWFCzqNuJbjLvUOgRyjSPcA/nlynyGaFibGrvuRk4yNf4QIIUQ9mqNiGw"
    "qeWqTQjsuW5sEwJ7GthCQiBea8OINBAOBcfdVA3HdfTYcbkcO1aosbRZBTyH8HuJfMi5LY"
    "XmVpHe4emHYWYOxKA9u+x9eJ6ZBxeDq7/j6gsg9y8GJ3mNAemYUJcvJyOFzK2QFzm/J6gs"
    "EsrYUJhl3drzuwkiRRQbHzGNef/O7TMe5M6Y5kbJNh0qXcS4QnrVllx1hZbw4yIHYQt5wA"
    "nlUXKPRMEo9FRNRyGbbhix7qDm8BrWFLier7mh1uKCkGq+F15YaCwGjK9hImRXJM6kFrMB"
    "9rWBTQi/3RlATItKx+GHSAlCTX7vSmnmcB6kzRDQCPcxxRWPeKu+WvW1BWvV3pD0Vn3taW"
    "AL6mtxFW2w1ZB3W2rDYfO7syveb+DkigV+E82aemxw7xCTYAZBsLItRKOOYjXKFatRUKxe"
    "RClMnzMM0uzkcdF1R5TrBvZlE3AwYVAxUMuTAUXPHUF10/mAcEabnPziyVLvR+UNVvCa3C"
    "7ot+itGHe7ku/EdLRZkifr9QRTPA7wmenPsbXERMj7tnPgEebAUr8IyG4BL3/ovWQTevv0"
    "wKMcfr/1IS1JIcVFB1Xpo4BXao+8tzmWVopvhRRvcyx7GljFb8PiI4WK9+M/N4OrstPGGb"
    "dcVG8xx/eTjSx2oHGdxr6sLX2QroqjADkMYb8jHrimhVHgUS3S8nosFy9xg7xIa880rv43"
    "uGDGX1DUDKjiP91UHNrIeO1ITiGfqTGOaqVqjKOKXI0o3JpDoj1IkTVVMcuopJJYgrTO1j"
    "DL0sx13Xx1NMp2P11dTiRnXA8ozwiVT98Fl908bbWWn2SJqdFkDQyr7yaAa8lT8ycyiBW0"
    "t4odJS6PxYzWlilaGQd61NfL/f80or0e"
)
