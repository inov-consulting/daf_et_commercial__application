"""Fixtures pour tests d'intégration API.

Stratégie :
- On override les repositories par des InMemory.
- On override ``get_current_user`` pour qu'il utilise le token Bearer comme
  email direct (évite d'appeler Keycloak pendant les tests).
- On désactive ``init_db`` / ``close_db`` pour ne pas connecter Tortoise.
"""

from typing import Annotated

import pytest
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.testclient import TestClient

from app.api.deps import get_company_repo, get_current_user, get_user_repo
from app.domain.shared.company import Company
from app.domain.shared.user import User
from app.domain.shared.value_objects import Country, Currency
from app.infrastructure.db.repositories.user import UserRepository
from app.main import app
from tests.fakes.repositories import InMemoryCompanyRepository, InMemoryUserRepository


@pytest.fixture(autouse=True)
def patch_db_lifecycle():
    """Empêche Tortoise de se connecter pendant les tests d'intégration."""
    import app.main as main_module

    original_init = main_module.init_db
    original_close = main_module.close_db

    async def _noop() -> None:
        pass

    main_module.init_db = _noop
    main_module.close_db = _noop
    yield
    main_module.init_db = original_init
    main_module.close_db = original_close


@pytest.fixture
def fake_user_repo() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def fake_company_repo() -> InMemoryCompanyRepository:
    return InMemoryCompanyRepository()


http_bearer_test = HTTPBearer(auto_error=True)


async def _fake_get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(http_bearer_test)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> User:
    """Version test de get_current_user : le token = l'email de l'utilisateur.
    Injecte les rôles simulés dans request.state.keycloak_roles pour que
    require_permission fonctionne correctement."""
    email = credentials.credentials.strip().lower()
    user = await user_repo.get_by_email(email)
    if user is None or not user.is_active:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Utilisateur introuvable ou inactif",
        )
    # Simule les rôles du token Keycloak selon l'utilisateur
    email = user.email
    if email == "admin@inov.com":
        request.state.keycloak_roles = {
            "user:create", "user:read", "user:update",
            "company:create", "company:read", "company:update",
        }
    else:
        # commercial — permissions limitées
        request.state.keycloak_roles = {"company:read"}
    return user


@pytest.fixture
def client(
    fake_user_repo: InMemoryUserRepository,
    fake_company_repo: InMemoryCompanyRepository,
):
    app.dependency_overrides[get_user_repo] = lambda: fake_user_repo
    app.dependency_overrides[get_company_repo] = lambda: fake_company_repo
    app.dependency_overrides[get_current_user] = _fake_get_current_user
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
            company_ids=[holding.id],
            email="admin@inov.com",
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
            company_ids=[agence.id],
            email="commercial@hawaparaiso.sn",
            first_name="Moussa",
            last_name="Diop",
        )
    )
    return commercial
