"""Implémentations in-memory des repositories pour les tests.

Respectent les ports Protocol définis dans app.domain.shared.ports.repositories.
"""

from collections.abc import Sequence
from copy import deepcopy
from uuid import UUID

from app.domain.shared.company import Company
from app.domain.shared.user import User


class InMemoryCompanyRepository:
    def __init__(self) -> None:
        self._by_id: dict[UUID, Company] = {}

    async def add(self, company: Company) -> Company:
        self._by_id[company.id] = deepcopy(company)
        return deepcopy(self._by_id[company.id])

    async def get_by_id(self, company_id: UUID) -> Company | None:
        c = self._by_id.get(company_id)
        return deepcopy(c) if c else None

    async def get_by_name(self, name: str) -> Company | None:
        for c in self._by_id.values():
            if c.name == name:
                return deepcopy(c)
        return None

    async def list_all(self, *, limit: int = 100, offset: int = 0) -> Sequence[Company]:
        sorted_companies = sorted(self._by_id.values(), key=lambda c: c.name)
        return [deepcopy(c) for c in sorted_companies[offset : offset + limit]]

    async def update(self, company: Company) -> Company:
        if company.id not in self._by_id:
            raise ValueError(f"Company {company.id} introuvable")
        self._by_id[company.id] = deepcopy(company)
        return deepcopy(self._by_id[company.id])


class InMemoryUserRepository:
    def __init__(self) -> None:
        self._by_id: dict[UUID, User] = {}

    async def add(self, user: User) -> User:
        self._by_id[user.id] = deepcopy(user)
        return deepcopy(self._by_id[user.id])

    async def get_by_id(self, user_id: UUID) -> User | None:
        u = self._by_id.get(user_id)
        return deepcopy(u) if u else None

    async def get_by_email(self, email: str) -> User | None:
        email_clean = email.strip().lower()
        for u in self._by_id.values():
            if u.email == email_clean:
                return deepcopy(u)
        return None

    async def list_by_company(
        self,
        company_id: UUID,
        *,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[User]:
        filtered = [u for u in self._by_id.values() if u.company_id == company_id]
        filtered.sort(key=lambda u: u.email)
        return [deepcopy(u) for u in filtered[offset : offset + limit]]

    async def update(self, user: User) -> User:
        if user.id not in self._by_id:
            raise ValueError(f"User {user.id} introuvable")
        self._by_id[user.id] = deepcopy(user)
        return deepcopy(self._by_id[user.id])
