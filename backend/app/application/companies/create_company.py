"""Use case : créer une nouvelle entité (Company)."""

from dataclasses import dataclass
from uuid import UUID

from app.application.shared.exceptions import ConflictError
from app.domain.shared.company import Company
from app.domain.shared.ports.repositories import CompanyRepository
from app.domain.shared.value_objects import Country, Currency


@dataclass(slots=True, frozen=True)
class CreateCompanyInput:
    name: str
    country: Country
    default_currency: Currency
    parent_company_id: UUID | None = None


class CreateCompanyUseCase:
    def __init__(self, company_repo: CompanyRepository) -> None:
        self._company_repo = company_repo

    async def execute(self, data: CreateCompanyInput) -> Company:
        existing = await self._company_repo.get_by_name(data.name)
        if existing is not None:
            raise ConflictError(f"Une entité '{data.name}' existe déjà")

        if data.parent_company_id is not None:
            parent = await self._company_repo.get_by_id(data.parent_company_id)
            if parent is None:
                raise ConflictError("Parent company introuvable")

        company = Company.new(
            name=data.name,
            country=data.country,
            default_currency=data.default_currency,
            parent_company_id=data.parent_company_id,
        )
        return await self._company_repo.add(company)
