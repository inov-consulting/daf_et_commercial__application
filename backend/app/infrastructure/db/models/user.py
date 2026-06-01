"""ORM model pour User."""

from uuid import UUID

from tortoise import fields

from app.domain.shared.user import User
from app.infrastructure.db.base import BaseModel


class UserOrm(BaseModel):
    company_ids: list[str] = fields.JSONField(default=list)
    email: str = fields.CharField(max_length=255, unique=True, index=True)
    first_name: str = fields.CharField(max_length=128, default="")
    last_name: str = fields.CharField(max_length=128, default="")
    is_active: bool = fields.BooleanField(default=True)

    class Meta:
        table = "users"

    def to_domain(self) -> User:
        return User(
            id=self.id,
            company_ids=[UUID(c) for c in self.company_ids] if self.company_ids else [],
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            is_active=self.is_active,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )

    @classmethod
    def from_domain(cls, user: User) -> "UserOrm":
        return cls(
            id=user.id,
            company_ids=[str(c) for c in user.company_ids],
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
        )

    def apply_domain(self, user: User) -> None:
        self.email = user.email
        self.company_ids = [str(c) for c in user.company_ids]
        self.first_name = user.first_name
        self.last_name = user.last_name
        self.is_active = user.is_active
