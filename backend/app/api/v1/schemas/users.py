"""Schémas Pydantic User."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.v1.schemas.companies import CompanyOut
from app.domain.shared.user import User


class UserCreate(BaseModel):
    email: str
    company_ids: list[UUID]
    group_ids: list[str] = Field(..., min_length=1)
    first_name: str = ""
    last_name: str = ""
    password: str | None = Field(default=None, exclude=True)
    temporary_password: bool = False

    @field_validator("group_ids")
    @classmethod
    def group_ids_not_empty(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("Au moins un groupe est obligatoire")
        return v


class ChangePasswordIn(BaseModel):
    current_password: str = Field(..., min_length=1, description="Mot de passe actuel.")
    new_password: str = Field(..., min_length=8, description="Nouveau mot de passe (min 8 caractères).")


class UserUpdate(BaseModel):
    company_ids: list[UUID] | None = None
    group_ids: list[str] | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None


class GroupOut(BaseModel):
    id: str
    name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    first_name: str
    last_name: str
    companies: list[CompanyOut] = []
    groups: list[GroupOut] = []
    permissions: list[str] = []
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(
        cls,
        user: User,
        companies: list[CompanyOut] | None = None,
        groups: list[GroupOut] | None = None,
        permissions: list[str] | None = None,
    ) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            companies=companies or [],
            groups=groups or [],
            permissions=permissions or [],
            is_active=user.is_active,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
