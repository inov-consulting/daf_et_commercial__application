"""Entité Company.

Représente une entité juridique : Holding INOV, agence Sénégal, agence CI, etc.
Multi-tenant : toutes les autres entités métier portent un company_id qui
référence celle-ci.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from app.domain.shared.value_objects import Country, Currency


@dataclass(slots=True, kw_only=True)
class Company:
    id: UUID
    name: str
    country: Country
    country_name: str = ""
    default_currency: Currency
    erp_id: int | None = None
    parent_company_id: UUID | None = None
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def new(
        cls,
        *,
        name: str,
        country: Country,
        country_name: str = "",
        default_currency: Currency,
        erp_id: int | None = None,
        parent_company_id: UUID | None = None,
    ) -> "Company":
        if not name.strip():
            raise ValueError("Company.name ne peut pas être vide")
        return cls(
            id=uuid4(),
            name=name.strip(),
            country=country,
            country_name=country_name,
            default_currency=default_currency,
            erp_id=erp_id,
            parent_company_id=parent_company_id,
        )

    def deactivate(self) -> None:
        self.is_active = False

    def reactivate(self) -> None:
        self.is_active = True
