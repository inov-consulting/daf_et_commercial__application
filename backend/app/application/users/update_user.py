"""Use case : mettre à jour un utilisateur (rôle, identité, statut, mot de passe)."""

from dataclasses import dataclass
from uuid import UUID

from app.application.shared.exceptions import NotFoundError
from app.core.security import hash_password
from app.domain.shared.ports.repositories import UserRepository
from app.domain.shared.role import Role
from app.domain.shared.user import User


@dataclass(slots=True, frozen=True)
class UpdateUserInput:
    role: Role | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None
    new_password: str | None = None


class UpdateUserUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: UUID, data: UpdateUserInput) -> User:
        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} introuvable")

        if data.role is not None:
            user.change_role(data.role)
        if data.first_name is not None:
            user.first_name = data.first_name.strip()
        if data.last_name is not None:
            user.last_name = data.last_name.strip()
        if data.is_active is False:
            user.deactivate()
        elif data.is_active is True:
            user.is_active = True
        if data.new_password is not None:
            user.update_password(hash_password(data.new_password))

        return await self._user_repo.update(user)
