async def _login(client, email: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


async def test_admin_creates_user(client, seeded_admin) -> None:
    token = await _login(client, "admin@inov.com", "AdminPass123!")

    # Crée d'abord une company
    rc = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Agence Test", "country": "SN", "default_currency": "XOF"},
    )
    company_id = rc.json()["id"]

    r = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "company_id": company_id,
            "email": "new.commercial@hawaparaiso.sn",
            "password": "Password123!",
            "role": "commercial",
            "first_name": "Aminata",
            "last_name": "Sow",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "new.commercial@hawaparaiso.sn"
    assert body["role"] == "commercial"
    assert "password_hash" not in body  # ne doit jamais fuir


async def test_commercial_cannot_list_users(client, seeded_commercial) -> None:
    token = await _login(client, "commercial@hawaparaiso.sn", "CommPass123!")
    r = client.get(
        f"/api/v1/users?company_id={seeded_commercial.company_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 403


async def test_update_user_changes_role(client, seeded_admin) -> None:
    token = await _login(client, "admin@inov.com", "AdminPass123!")

    rc = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "X", "country": "SN", "default_currency": "XOF"},
    )
    company_id = rc.json()["id"]

    ru = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "company_id": company_id,
            "email": "u@v.com",
            "password": "Password123!",
            "role": "commercial",
        },
    )
    user_id = ru.json()["id"]

    r = client.patch(
        f"/api/v1/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "manager_pays"},
    )
    assert r.status_code == 200
    assert r.json()["role"] == "manager_pays"
