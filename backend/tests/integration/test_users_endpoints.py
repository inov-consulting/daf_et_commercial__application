async def test_admin_creates_user(client, seeded_admin) -> None:
    # Crée d'abord une company
    rc = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json={"name": "Agence Test", "country": "SN", "default_currency": "XOF"},
    )
    company_id = rc.json()["id"]

    r = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json={
            "company_ids": [company_id],
            "email": "new.commercial@hawaparaiso.sn",
            "first_name": "Aminata",
            "last_name": "Sow",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "new.commercial@hawaparaiso.sn"


async def test_commercial_cannot_list_users(client, seeded_commercial) -> None:
    r = client.get(
        f"/api/v1/users?company_id={seeded_commercial.company_ids[0]}",
        headers={"Authorization": f"Bearer {seeded_commercial.email}"},
    )
    assert r.status_code == 403


async def test_update_user_changes_role(client, seeded_admin) -> None:
    rc = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json={"name": "X", "country": "SN", "default_currency": "XOF"},
    )
    company_id = rc.json()["id"]

    ru = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json={
            "company_ids": [company_id],
            "email": "u@v.com",
        },
    )
    user_id = ru.json()["id"]

    r = client.patch(
        f"/api/v1/users/{user_id}",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json={"first_name": "Moussa"},
    )
    assert r.status_code == 200
    assert r.json()["first_name"] == "Moussa"
