"""Use case : créer un profil utilisateur local (company_ids + statut)."""

from dataclasses import dataclass
from uuid import UUID

from app.application.shared.exceptions import ConflictError, NotFoundError
from app.domain.shared.ports.repositories import CompanyRepository, UserRepository
from app.domain.shared.user import User


@dataclass(slots=True, frozen=True)
class CreateUserInput:
    keycloak_id: UUID       # sub du token Keycloak
    company_ids: list[UUID]


class CreateUserUseCase:
    def __init__(
        self,
        user_repo: UserRepository,
        company_repo: CompanyRepository,
    ) -> None:
        self._user_repo = user_repo
        self._company_repo = company_repo

    async def execute(self, data: CreateUserInput) -> User:
        for cid in data.company_ids:
            company = await self._company_repo.get_by_id(cid)
            if company is None:
                raise NotFoundError(f"Company {cid} introuvable")

        existing = await self._user_repo.get_by_id(data.keycloak_id)
        if existing is not None:
            raise ConflictError(f"Utilisateur {data.keycloak_id} existe déjà")

        user = User.new(keycloak_id=data.keycloak_id, company_ids=data.company_ids)
        return await self._user_repo.add(user)
