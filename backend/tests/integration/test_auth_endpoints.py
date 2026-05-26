async def test_login_returns_tokens(client, seeded_admin) -> None:
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@inov.com", "password": "AdminPass123!"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"


async def test_login_invalid_credentials(client, seeded_admin) -> None:
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@inov.com", "password": "wrong"},
    )
    assert r.status_code == 401


async def test_me_returns_authenticated_user(client, seeded_admin) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@inov.com", "password": "AdminPass123!"},
    )
    token = login.json()["access_token"]
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "admin@inov.com"
    assert r.json()["role"] == "admin_inov"


async def test_me_without_token_unauthorized(client) -> None:
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


async def test_refresh_token_returns_new_tokens(client, seeded_admin) -> None:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@inov.com", "password": "AdminPass123!"},
    )
    refresh = login.json()["refresh_token"]

    r = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    assert r.json()["access_token"]
    assert r.json()["refresh_token"]
