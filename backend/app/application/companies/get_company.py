"""Use case : récupérer une entité par son id."""

from uuid import UUID

from app.application.shared.exceptions import NotFoundError
from app.domain.shared.company import Company
from app.domain.shared.ports.repositories import CompanyRepository


class GetCompanyUseCase:
    def __init__(self, company_repo: CompanyRepository) -> None:
        self._company_repo = company_repo

    async def execute(self, company_id: UUID) -> Company:
        company = await self._company_repo.get_by_id(company_id)
        if company is None:
            raise NotFoundError(f"Company {company_id} introuvable")
        return company
