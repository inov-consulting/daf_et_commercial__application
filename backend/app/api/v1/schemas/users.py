"""Schémas Pydantic User."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.shared.role import Role
from app.domain.shared.user import User


class UserCreate(BaseModel):
    company_id: UUID
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: Role
    first_name: str = Field("", max_length=128)
    last_name: str = Field("", max_length=128)


class UserUpdate(BaseModel):
    role: Role | None = None
    first_name: str | None = Field(None, max_length=128)
    last_name: str | None = Field(None, max_length=128)
    is_active: bool | None = None
    new_password: str | None = Field(None, min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    email: EmailStr
    role: Role
    first_name: str
    last_name: str
    is_active: bool
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, user: User) -> "UserOut":
        return cls.model_validate(user)
