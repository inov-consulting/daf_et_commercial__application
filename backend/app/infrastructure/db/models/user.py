"""ORM model pour User."""

from uuid import UUID

from tortoise import fields

from app.domain.shared.role import Role
from app.domain.shared.user import User
from app.infrastructure.db.base import BaseModel


class UserOrm(BaseModel):
    company_id: UUID = fields.UUIDField(index=True)
    email: str = fields.CharField(max_length=255, unique=True, index=True)
    password_hash: str = fields.CharField(max_length=255)
    role: str = fields.CharField(max_length=32)
    first_name: str = fields.CharField(max_length=128, default="")
    last_name: str = fields.CharField(max_length=128, default="")
    is_active: bool = fields.BooleanField(default=True)

    class Meta:
        table = "users"

    def to_domain(self) -> User:
        return User(
            id=self.id,
            company_id=self.company_id,
            email=self.email,
            password_hash=self.password_hash,
            role=Role(self.role),
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
            company_id=user.company_id,
            email=user.email,
            password_hash=user.password_hash,
            role=user.role.value,
            first_name=user.first_name,
            last_name=user.last_name,
            is_active=user.is_active,
        )

    def apply_domain(self, user: User) -> None:
        self.email = user.email
        self.password_hash = user.password_hash
        self.role = user.role.value
        self.first_name = user.first_name
        self.last_name = user.last_name
        self.is_active = user.is_active
