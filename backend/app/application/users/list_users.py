"""Use case : lister les utilisateurs, avec filtre optionnel par entité."""

from collections.abc import Sequence
from uuid import UUID

from app.domain.shared.ports.repositories import UserRepository
from app.domain.shared.user import User


class ListUsersUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(
        self,
        *,
        company_id: UUID | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[User]:
        if company_id is not None:
            return await self._user_repo.list_by_company(
                company_id,
                limit=limit,
                offset=offset,
            )
        return await self._user_repo.list_all(limit=limit, offset=offset)
