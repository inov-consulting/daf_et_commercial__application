async def test_me_returns_authenticated_user(client, seeded_admin) -> None:
    r = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
    )
    assert r.status_code == 200
    assert r.json()["email"] == "admin@inov.com"


async def test_me_without_token_unauthorized(client) -> None:
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
