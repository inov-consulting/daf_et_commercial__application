"""Use case : mettre à jour un utilisateur (rôle, identité, statut)."""

from dataclasses import dataclass
from uuid import UUID

from app.application.shared.exceptions import NotFoundError
from app.domain.shared.ports.repositories import UserRepository
from app.domain.shared.user import User


@dataclass(slots=True, frozen=True)
class UpdateUserInput:
    company_ids: list[UUID] | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None


class UpdateUserUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: UUID, data: UpdateUserInput) -> User:
        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} introuvable")

        if data.company_ids is not None:
            user.company_ids = list(data.company_ids)
        if data.first_name is not None:
            user.first_name = data.first_name
        if data.last_name is not None:
            user.last_name = data.last_name
        if data.is_active is False:
            user.deactivate()
        elif data.is_active is True:
            user.is_active = True

        return await self._user_repo.update(user)
