"""Fixtures pour tests d'intégration API.

Stratégie : on override les dépendances de repositories par des InMemory.
Pas de DB requise. Couvre le flow HTTP + Pydantic + middleware d'erreurs.
"""

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_company_repo, get_user_repo
from app.core.security import hash_password
from app.domain.shared.company import Company
from app.domain.shared.role import Role
from app.domain.shared.user import User
from app.domain.shared.value_objects import Country, Currency
from app.main import app
from tests.fakes.repositories import InMemoryCompanyRepository, InMemoryUserRepository


@pytest.fixture
def fake_user_repo() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def fake_company_repo() -> InMemoryCompanyRepository:
    return InMemoryCompanyRepository()


@pytest.fixture
def client(
    fake_user_repo: InMemoryUserRepository,
    fake_company_repo: InMemoryCompanyRepository,
):
    app.dependency_overrides[get_user_repo] = lambda: fake_user_repo
    app.dependency_overrides[get_company_repo] = lambda: fake_company_repo
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def seeded_admin(
    fake_user_repo: InMemoryUserRepository,
    fake_company_repo: InMemoryCompanyRepository,
) -> User:
    holding = await fake_company_repo.add(
        Company.new(name="INOV Holding", country=Country.CM, default_currency=Currency.XAF)
    )
    admin = await fake_user_repo.add(
        User.new(
            company_id=holding.id,
            email="admin@inov.com",
            password_hash=hash_password("AdminPass123!"),
            role=Role.ADMIN_INOV,
            first_name="Admin",
            last_name="INOV",
        )
    )
    return admin


@pytest.fixture
async def seeded_commercial(
    fake_user_repo: InMemoryUserRepository,
    fake_company_repo: InMemoryCompanyRepository,
) -> User:
    agence = await fake_company_repo.add(
        Company.new(
            name="Hawa Paraiso Sénégal",
            country=Country.SN,
            default_currency=Currency.XOF,
        )
    )
    commercial = await fake_user_repo.add(
        User.new(
            company_id=agence.id,
            email="commercial@hawaparaiso.sn",
            password_hash=hash_password("CommPass123!"),
            role=Role.COMMERCIAL,
            first_name="Moussa",
            last_name="Diop",
        )
    )
    return commercial
