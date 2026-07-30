async def test_admin_can_create_company(client, seeded_admin) -> None:
    r = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json={
            "name": "Hawa Paraiso Côte d'Ivoire",
            "country": "CI",
            "default_currency": "XOF",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Hawa Paraiso Côte d'Ivoire"
    assert body["country"] == "CI"


async def test_commercial_cannot_create_company(client, seeded_commercial) -> None:
    r = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {seeded_commercial.email}"},
        json={"name": "X", "country": "SN", "default_currency": "XOF"},
    )
    assert r.status_code == 403


async def test_list_companies_paginated(client, seeded_admin) -> None:
    r = client.get(
        "/api/v1/companies?limit=10&offset=0",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert body["limit"] == 10
    assert body["offset"] == 0


async def test_duplicate_company_name_returns_409(client, seeded_admin) -> None:
    payload = {"name": "Dup", "country": "SN", "default_currency": "XOF"}
    r1 = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json=payload,
    )
    assert r1.status_code == 201
    r2 = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {seeded_admin.email}"},
        json=payload,
    )
    assert r2.status_code == 409
