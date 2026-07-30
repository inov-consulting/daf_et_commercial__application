"""Use case : mettre à jour le nom et les informations de contact d'une Company."""

from dataclasses import dataclass

from app.application.shared.exceptions import NotFoundError
from app.domain.shared.company import Company
from app.domain.shared.ports.repositories import CompanyRepository


@dataclass(slots=True, frozen=True)
class UpdateCompanyInput:
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None


class UpdateCompanyUseCase:
    def __init__(self, company_repo: CompanyRepository) -> None:
        self._company_repo = company_repo

    async def execute(self, company_id, data: UpdateCompanyInput) -> Company:
        company = await self._company_repo.get_by_id(company_id)
        if company is None:
            raise NotFoundError(f"Company {company_id} introuvable")

        if data.name is not None:
            company.name = data.name
        if data.email is not None:
            company.email = data.email
        if data.phone is not None:
            company.phone = data.phone
        if data.website is not None:
            company.website = data.website
        if data.address is not None:
            company.address = data.address

        return await self._company_repo.update(company)
