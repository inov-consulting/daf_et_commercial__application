"""Tests des use cases avec InMemory repositories.

Pas de DB, pas de HTTP — uniquement la logique métier.
"""

import pytest
from app.application.companies.create_company import (
    CreateCompanyInput,
    CreateCompanyUseCase,
)
from app.application.shared.exceptions import ConflictError, NotFoundError
from app.application.users.create_user import CreateUserInput, CreateUserUseCase
from app.application.users.list_users import ListUsersUseCase
from app.domain.shared.company import Company
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
                keycloak_id=uuid4(),
                company_ids=[uuid4()],
            )
        )


async def test_create_user_duplicate_keycloak_id_rejected() -> None:
    from uuid import uuid4

    users = InMemoryUserRepository()
    companies = InMemoryCompanyRepository()
    company = await companies.add(
        Company.new(name="C1", country=Country.SN, default_currency=Currency.XOF)
    )
    kid = uuid4()

    uc = CreateUserUseCase(users, companies)
    await uc.execute(CreateUserInput(keycloak_id=kid, company_ids=[company.id]))
    with pytest.raises(ConflictError):
        await uc.execute(CreateUserInput(keycloak_id=kid, company_ids=[company.id]))


async def test_list_users_filters_by_company() -> None:
    users = InMemoryUserRepository()
    companies = InMemoryCompanyRepository()
    c1 = await companies.add(
        Company.new(name="C1", country=Country.SN, default_currency=Currency.XOF)
    )
    c2 = await companies.add(
        Company.new(name="C2", country=Country.CI, default_currency=Currency.XOF)
    )
    from uuid import uuid4

    create = CreateUserUseCase(users, companies)
    u1 = await create.execute(CreateUserInput(keycloak_id=uuid4(), company_ids=[c1.id]))
    u2 = await create.execute(CreateUserInput(keycloak_id=uuid4(), company_ids=[c2.id]))

    list_c1 = await ListUsersUseCase(users).execute(company_id=c1.id)
    list_c2 = await ListUsersUseCase(users).execute(company_id=c2.id)
    assert len(list_c1) == 1
    assert list_c1[0].id == u1.id
    assert len(list_c2) == 1
    assert list_c2[0].id == u2.id


