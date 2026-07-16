"""ORM model pour Company."""

from uuid import UUID

from tortoise import fields
from app.domain.shared.company import Company
from app.domain.shared.value_objects import Country, Currency
from app.infrastructure.db.base import BaseModel


class CompanyOrm(BaseModel):
    name: str = fields.CharField(max_length=255, unique=True)
    country: str = fields.CharField(max_length=2)
    country_name: str = fields.CharField(max_length=100, default="")
    default_currency: str = fields.CharField(max_length=3)
    erp_id: int | None = fields.IntField(null=True)
    parent_company_id: UUID | None = fields.UUIDField(null=True)
    is_active: bool = fields.BooleanField(default=True)

    class Meta:
        table = "companies"

    # ── Mapping ORM ↔ Domain ────────────────────────────────────────────
    def to_domain(self) -> Company:
        return Company(
            id=self.id,
            name=self.name,
            country=Country(self.country),
            country_name=self.country_name,
            default_currency=Currency(self.default_currency),
            erp_id=self.erp_id,
            parent_company_id=self.parent_company_id,
            is_active=self.is_active,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )

    @classmethod
    def from_domain(cls, company: Company) -> "CompanyOrm":
        return cls(
            id=company.id,
            name=company.name,
            country=company.country.value,
            country_name=company.country_name,
            default_currency=company.default_currency.value,
            erp_id=company.erp_id,
            parent_company_id=company.parent_company_id,
            is_active=company.is_active,
        )

    def apply_domain(self, company: Company) -> None:
        """Met à jour les colonnes ORM à partir d'une entité domaine (update)."""
        self.name = company.name
        self.country = company.country.value
        self.country_name = company.country_name
        self.default_currency = company.default_currency.value
        self.erp_id = company.erp_id
        self.parent_company_id = company.parent_company_id
        self.is_active = company.is_active
