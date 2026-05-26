"""Repository concret pour Company (Tortoise ORM)."""

from collections.abc import Sequence
from uuid import UUID

from app.domain.shared.company import Company
from app.infrastructure.db.models.company import CompanyOrm


class CompanyRepository:
    async def add(self, company: Company) -> Company:
        orm = CompanyOrm.from_domain(company)
        await orm.save()
        return orm.to_domain()

    async def get_by_id(self, company_id: UUID) -> Company | None:
        orm = await CompanyOrm.get_or_none(id=company_id)
        return orm.to_domain() if orm else None

    async def get_by_name(self, name: str) -> Company | None:
        orm = await CompanyOrm.get_or_none(name=name)
        return orm.to_domain() if orm else None

    async def list_all(self, *, limit: int = 100, offset: int = 0) -> Sequence[Company]:
        rows = await CompanyOrm.all().order_by("name").offset(offset).limit(limit)
        return [r.to_domain() for r in rows]

    async def update(self, company: Company) -> Company:
        orm = await CompanyOrm.get_or_none(id=company.id)
        if orm is None:
            raise ValueError(f"Company {company.id} introuvable")
        orm.apply_domain(company)
        await orm.save()
        return orm.to_domain()

