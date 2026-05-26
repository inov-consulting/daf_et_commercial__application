"""Tests des use cases avec InMemory repositories.

Pas de DB, pas de HTTP — uniquement la logique métier.
"""

import pytest
from app.application.auth.login_user import LoginUserUseCase
from app.application.auth.refresh_token import RefreshTokenUseCase
from app.application.companies.create_company import (
    CreateCompanyInput,
    CreateCompanyUseCase,
)
from app.application.shared.exceptions import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
)
from app.application.users.create_user import CreateUserInput, CreateUserUseCase
from app.application.users.list_users import ListUsersUseCase
from app.core.security import hash_password
from app.domain.shared.company import Company
from app.domain.shared.role import Role
from app.domain.shared.user import User
from app.domain.shared.value_objects import Country, Currency

from tests.fakes.repositories import InMemoryCompanyRepository, InMemoryUserRepository


# ── Companies ───────────────────────────────────────────────────────────
async def test_create_company_persists_and_returns() -> None:
    repo = InMemoryCompanyRepository()
    uc = CreateCompanyUseCase(repo)

    company = await uc.execute(
        CreateCompanyInput(
            name="Hawa Paraiso Sénégal",
            country=Country.SN,
            default_currency=Currency.XOF,
        )
    )
    assert company.name == "Hawa Paraiso Sénégal"
    assert await repo.get_by_id(company.id) is not None


async def test_create_company_duplicate_name_rejected() -> None:
    repo = InMemoryCompanyRepository()
    uc = CreateCompanyUseCase(repo)
    inp = CreateCompanyInput(
        name="Hawa Paraiso SN",
        country=Country.SN,
        default_currency=Currency.XOF,
    )
    await uc.execute(inp)
    with pytest.raises(ConflictError):
        await uc.execute(inp)


async def test_create_company_unknown_parent_rejected() -> None:
    from uuid import uuid4

    repo = InMemoryCompanyRepository()
    uc = CreateCompanyUseCase(repo)
    with pytest.raises(ConflictError):
        await uc.execute(
            CreateCompanyInput(
                name="Filiale",
                country=Country.CI,
                default_currency=Currency.XOF,
                parent_company_id=uuid4(),
            )
        )


# ── Users ───────────────────────────────────────────────────────────────
async def test_create_user_requires_existing_company() -> None:
    from uuid import uuid4

    users = InMemoryUserRepository()
    companies = InMemoryCompanyRepository()
    uc = CreateUserUseCase(users, companies)

    with pytest.raises(NotFoundError):
        await uc.execute(
            CreateUserInput(
                company_id=uuid4(),
                email="a@b.com",
                password="motdepasse",
                role=Role.COMMERCIAL,
            )
        )


async def test_create_user_duplicate_email_rejected() -> None:
    users = InMemoryUserRepository()
    companies = InMemoryCompanyRepository()
    company = await companies.add(
        Company.new(name="C1", country=Country.SN, default_currency=Currency.XOF)
    )

    uc = CreateUserUseCase(users, companies)
    await uc.execute(
        CreateUserInput(
            company_id=company.id,
            email="x@y.com",
            password="pwd-abcdefg",
            role=Role.COMMERCIAL,
        )
    )
    with pytest.raises(ConflictError):
        await uc.execute(
            CreateUserInput(
                company_id=company.id,
                email="x@y.com",
                password="pwd-abcdefg",
                role=Role.FINANCE,
            )
        )


async def test_list_users_filters_by_company() -> None:
    users = InMemoryUserRepository()
    companies = InMemoryCompanyRepository()
    c1 = await companies.add(
        Company.new(name="C1", country=Country.SN, default_currency=Currency.XOF)
    )
    c2 = await companies.add(
        Company.new(name="C2", country=Country.CI, default_currency=Currency.XOF)
    )
    create = CreateUserUseCase(users, companies)
    await create.execute(
        CreateUserInput(
            company_id=c1.id, email="a@c1.com", password="pwd12345", role=Role.COMMERCIAL
        )
    )
    await create.execute(
        CreateUserInput(
            company_id=c2.id, email="b@c2.com", password="pwd12345", role=Role.COMMERCIAL
        )
    )

    list_c1 = await ListUsersUseCase(users).execute(company_id=c1.id)
    list_c2 = await ListUsersUseCase(users).execute(company_id=c2.id)
    assert len(list_c1) == 1
    assert list_c1[0].email == "a@c1.com"
    assert len(list_c2) == 1
    assert list_c2[0].email == "b@c2.com"


# ── Auth ────────────────────────────────────────────────────────────────
async def test_login_with_valid_credentials() -> None:
    users = InMemoryUserRepository()
    companies = InMemoryCompanyRepository()
    company = await companies.add(
        Company.new(name="C", country=Country.SN, default_currency=Currency.XOF)
    )
    await users.add(
        User.new(
            company_id=company.id,
            email="hawa@paraiso.sn",
            password_hash=hash_password("MyStrongPassword!"),
            role=Role.DIRECTION,
        )
    )

    result = await LoginUserUseCase(users).execute(
        email="hawa@paraiso.sn", password="MyStrongPassword!"
    )
    assert result.access_token
    assert result.refresh_token
    assert result.token_type == "bearer"


async def test_login_unknown_user_returns_auth_error() -> None:
    users = InMemoryUserRepository()
    with pytest.raises(AuthenticationError):
        await LoginUserUseCase(users).execute(email="ghost@nowhere.com", password="x")


async def test_login_wrong_password_returns_auth_error() -> None:
    users = InMemoryUserRepository()
    companies = InMemoryCompanyRepository()
    company = await companies.add(
        Company.new(name="C", country=Country.SN, default_currency=Currency.XOF)
    )
    await users.add(
        User.new(
            company_id=company.id,
            email="u@e.com",
            password_hash=hash_password("right-password"),
            role=Role.COMMERCIAL,
        )
    )
    with pytest.raises(AuthenticationError):
        await LoginUserUseCase(users).execute(email="u@e.com", password="wrong-password")


async def test_refresh_with_invalid_token_rejected() -> None:
    users = InMemoryUserRepository()
    with pytest.raises(AuthenticationError):
        await RefreshTokenUseCase(users).execute(refresh_token="not-a-jwt")
