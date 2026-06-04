"""Ports (interfaces) des repositories User et Company.

Définis en Protocol pour rester duck-typing et faciliter les mocks en tests.
Les implémentations concrètes vivent dans app.infrastructure.db.repositories.
"""

from collections.abc import Sequence
from typing import Protocol
from uuid import UUID

from app.domain.shared.company import Company
from app.domain.shared.user import User


class CompanyRepository(Protocol):
    async def add(self, company: Company) -> Company: ...

    async def get_by_id(self, company_id: UUID) -> Company | None: ...

    async def get_by_name(self, name: str) -> Company | None: ...

    async def list_all(self, *, limit: int = 100, offset: int = 0) -> Sequence[Company]: ...

    async def update(self, company: Company) -> Company: ...


class UserRepository(Protocol):
    async def add(self, user: User) -> User: ...

    async def get_by_id(self, user_id: UUID) -> User | None: ...

    async def list_by_company(
        self,
        company_id: UUID,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[User]: ...

    async def update(self, user: User) -> User: ...
