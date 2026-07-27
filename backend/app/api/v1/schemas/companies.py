"""Schémas Pydantic Company."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.shared.company import Company
from app.domain.shared.value_objects import Country, Currency


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    country: Country
    default_currency: Currency
    parent_company_id: UUID | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    country: str
    default_currency: str
    erp_id: int | None = None
    parent_company_id: UUID | None = None
    is_active: bool = True
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    address: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_domain(cls, company: Company) -> "CompanyOut":
        country_display = company.country_name or company.country.value
        return cls(
            id=company.id,
            name=company.name,
            country=country_display,
            default_currency=company.default_currency.value,
            erp_id=company.erp_id,
            parent_company_id=company.parent_company_id,
            is_active=company.is_active,
            email=company.email,
            phone=company.phone,
            website=company.website,
            address=company.address,
            created_at=company.created_at,
            updated_at=company.updated_at,
        )
