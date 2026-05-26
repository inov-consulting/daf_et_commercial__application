"""Schémas Pydantic Company."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.shared.company import Company
from app.domain.shared.value_objects import Country, Currency


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    country: Country
    default_currency: Currency
    parent_company_id: UUID | None = None


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    country: Country
    default_currency: Currency
    parent_company_id: UUID | None
    is_active: bool
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, company: Company) -> "CompanyOut":
        return cls.model_validate(company)
