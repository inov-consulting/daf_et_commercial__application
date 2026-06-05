"""Seed minimal pour le développement.

Crée :
- Holding INOV (Cameroun, XAF)
- Agence Hawa Paraiso Sénégal (filiale, XOF)
- 1 admin INOV, 1 direction Hawa, 1 manager pays SN, 1 commercial SN, 1 finance

Idempotent : ne recrée pas ce qui existe déjà (par nom / email).

Usage :
    docker compose exec backend uv run python -m app.scripts.seed_dev
"""

import asyncio

from app.application.companies.create_company import (
    CreateCompanyInput,
    CreateCompanyUseCase,
)
from app.application.shared.exceptions import ConflictError
from app.application.users.create_user import CreateUserInput, CreateUserUseCase
from app.core.logging import configure_logging, get_logger
from app.domain.shared.company import Company
from app.domain.shared.role import Role
from app.domain.shared.user import User
from app.domain.shared.value_objects import Country, Currency
from app.infrastructure.db.repositories.company import CompanyRepository
from app.infrastructure.db.repositories.user import UserRepository
from app.infrastructure.db.session import close_db, init_db

configure_logging("INFO")
logger = get_logger(__name__)


SEED_PASSWORD = "ChangeMe123!"  # à modifier au premier login


async def _ensure_company(repo: CompanyRepository, data: CreateCompanyInput) -> Company:
    existing = await repo.get_by_name(data.name)
    if existing:
        logger.info("seed.company.skipped", name=data.name)
        return existing
    company = await CreateCompanyUseCase(repo).execute(data)
    logger.info("seed.company.created", name=company.name, id=str(company.id))
    return company


async def _ensure_user(
    users: UserRepository,
    companies: CompanyRepository,
    data: CreateUserInput,
) -> User | None:
    existing = await users.get_by_email(data.email)
    if existing:
        logger.info("seed.user.skipped", email=data.email)
        return existing
    try:
        user = await CreateUserUseCase(users, companies).execute(data)
    except ConflictError:
        logger.info("seed.user.exists", email=data.email)
        return None
    logger.info("seed.user.created", email=user.email, role=user.role.value)
    return user


async def seed() -> None:
    await init_db()
    try:
        companies = CompanyRepository()
        users = UserRepository()

        # Entités
        holding = await _ensure_company(
            companies,
            CreateCompanyInput(
                name="INOV Holding",
                country=Country.CM,
                default_currency=Currency.XAF,
            ),
        )
        agence_sn = await _ensure_company(
            companies,
            CreateCompanyInput(
                name="Hawa Paraiso Sénégal",
                country=Country.SN,
                default_currency=Currency.XOF,
                parent_company_id=holding.id,
            ),
        )

        # Utilisateurs
        await _ensure_user(
            users, companies,
            CreateUserInput(
                company_id=holding.id,
                email="admin@inov.com",
                password=SEED_PASSWORD,
                role=Role.ADMIN_INOV,
                first_name="Edwin",
                last_name="Tchakounte",
            ),
        )
        await _ensure_user(
            users, companies,
            CreateUserInput(
                company_id=agence_sn.id,
                email="hawa@hawaparaiso.sn",
                password=SEED_PASSWORD,
                role=Role.DIRECTION,
                first_name="Hawa",
                last_name="Paraiso",
            ),
        )
        await _ensure_user(
            users, companies,
            CreateUserInput(
                company_id=agence_sn.id,
                email="manager.sn@hawaparaiso.sn",
                password=SEED_PASSWORD,
                role=Role.MANAGER_PAYS,
                first_name="Aminata",
                last_name="Diallo",
            ),
        )
        await _ensure_user(
            users, companies,
            CreateUserInput(
                company_id=agence_sn.id,
                email="commercial.sn@hawaparaiso.sn",
                password=SEED_PASSWORD,
                role=Role.COMMERCIAL,
                first_name="Moussa",
                last_name="Diop",
            ),
        )
        await _ensure_user(
            users, companies,
            CreateUserInput(
                company_id=agence_sn.id,
                email="finance.sn@hawaparaiso.sn",
                password=SEED_PASSWORD,
                role=Role.FINANCE,
                first_name="Fatou",
                last_name="Ndiaye",
            ),
        )

    finally:
        await close_db()
    logger.info("seed.done", password_default=SEED_PASSWORD)


if __name__ == "__main__":
    asyncio.run(seed())
