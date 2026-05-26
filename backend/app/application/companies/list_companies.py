"""Use case : lister les entités."""

from collections.abc import Sequence

from app.domain.shared.company import Company
from app.domain.shared.ports.repositories import CompanyRepository


class ListCompaniesUseCase:
    def __init__(self, company_repo: CompanyRepository) -> None:
        self._company_repo = company_repo

    async def execute(self, *, limit: int = 100, offset: int = 0) -> Sequence[Company]:
        return await self._company_repo.list_all(limit=limit, offset=offset)
