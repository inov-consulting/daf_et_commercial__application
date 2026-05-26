"""Use case : récupérer un utilisateur par id."""

from uuid import UUID

from app.application.shared.exceptions import NotFoundError
from app.domain.shared.ports.repositories import UserRepository
from app.domain.shared.user import User


class GetUserUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: UUID) -> User:
        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} introuvable")
        return user
