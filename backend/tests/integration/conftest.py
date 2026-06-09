"""Fixtures pour les tests d'intégration API.

Stratégie :
- Repositories remplacés par des InMemory (pas de DB).
- get_current_user remplacé : le Bearer token = email de l'utilisateur.
- init_db / close_db / AiModelRepository.seed mockés (pas de connexion Tortoise).
"""

from typing import Annotated
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from app.api.deps import get_company_repo, get_current_user, get_user_repo
from app.domain.shared.company import Company
from app.domain.shared.user import User
from app.domain.shared.value_objects import Country, Currency
from app.infrastructure.db.repositories.user import UserRepository
from app.main import app
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.testclient import TestClient

from tests.fakes.repositories import InMemoryCompanyRepository, InMemoryUserRepository

_bearer = HTTPBearer(auto_error=True)


async def _fake_get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> User:
    """En test, le token Bearer est l'email de l'utilisateur.

    Injecte les rôles dans request.state.keycloak_roles pour que
    require_permission() fonctionne sans Keycloak.
    """
    email = credentials.credentials.strip().lower()
    user = await user_repo.get_by_email(email)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Utilisateur introuvable ou inactif")

    if user.email == "admin@inov.com":
        request.state.keycloak_roles = {
            "user:create", "user:read", "user:update",
            "company:create", "company:read", "company:update",
        }
    else:
        request.state.keycloak_roles = {"company:read"}
    return user


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
    """TestClient avec DB mockée et Keycloak remplacé."""
    app.dependency_overrides[get_user_repo] = lambda: fake_user_repo
    app.dependency_overrides[get_company_repo] = lambda: fake_company_repo
    app.dependency_overrides[get_current_user] = _fake_get_current_user

    # Les mocks doivent être configurés AVANT que TestClient démarre le lifespan.
    with (
        patch("app.main.init_db", new_callable=AsyncMock),
        patch("app.main.close_db", new_callable=AsyncMock),
        patch(
            "app.infrastructure.db.repositories.ai_config.AiModelRepository.seed",
            new_callable=AsyncMock,
        ),TestClient(app) as c
    ):
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
async def seeded_admin(
    fake_user_repo: InMemoryUserRepository,
    fake_company_repo: InMemoryCompanyRepository,
) -> User:
    """Admin avec accès complet."""
    holding = await fake_company_repo.add(
        Company.new(name="INOV Holding", country=Country.CM, default_currency=Currency.XAF)
    )
    # L'email doit être assigné AVANT add() pour que get_by_email() fonctionne.
    user = User.new(keycloak_id=uuid4(), company_ids=[holding.id])
    user.email = "admin@inov.com"
    user.first_name = "Admin"
    user.last_name = "INOV"
    return await fake_user_repo.add(user)


@pytest.fixture
async def seeded_commercial(
    fake_user_repo: InMemoryUserRepository,
    fake_company_repo: InMemoryCompanyRepository,
) -> User:
    """Commercial avec permissions limitées."""
    agence = await fake_company_repo.add(
        Company.new(
            name="Hawa Paraiso Sénégal",
            country=Country.SN,
            default_currency=Currency.XOF,
        )
    )
    user = User.new(keycloak_id=uuid4(), company_ids=[agence.id])
    user.email = "commercial@hawaparaiso.sn"
    user.first_name = "Moussa"
    user.last_name = "Diop"
    return await fake_user_repo.add(user)
