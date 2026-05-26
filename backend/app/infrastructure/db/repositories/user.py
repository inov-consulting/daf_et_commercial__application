"""Repository concret pour User (Tortoise ORM)."""

from collections.abc import Sequence
from uuid import UUID

from app.domain.shared.user import User
from app.infrastructure.db.models.user import UserOrm


class UserRepository:
    async def add(self, user: User) -> User:
        orm = UserOrm.from_domain(user)
        await orm.save()
        return orm.to_domain()

    async def get_by_id(self, user_id: UUID) -> User | None:
        orm = await UserOrm.get_or_none(id=user_id)
        return orm.to_domain() if orm else None

    async def get_by_email(self, email: str) -> User | None:
        orm = await UserOrm.get_or_none(email=email.strip().lower())
        return orm.to_domain() if orm else None

    async def list_by_company(
        self,
        company_id: UUID,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[User]:
        rows = (
            await UserOrm.filter(company_id=company_id)
            .order_by("email")
            .offset(offset)
            .limit(limit)
        )
        return [r.to_domain() for r in rows]

    async def update(self, user: User) -> User:
        orm = await UserOrm.get_or_none(id=user.id)
        if orm is None:
            raise ValueError(f"User {user.id} introuvable")
        orm.apply_domain(user)
        await orm.save()
        return orm.to_domain()

