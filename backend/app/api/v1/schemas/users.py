"""Schémas Pydantic User."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.api.v1.schemas.companies import CompanyOut
from app.domain.shared.user import User


class UserCreate(BaseModel):
    email: str
    company_ids: list[UUID]
    first_name: str = ""
    last_name: str = ""


class UserUpdate(BaseModel):
    company_ids: list[UUID] | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    first_name: str
    last_name: str
    companies: list[CompanyOut] = []
    is_active: bool
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, user: User, companies: list[CompanyOut] | None = None) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            company_ids=user.company_ids,
            companies=companies or [],
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
