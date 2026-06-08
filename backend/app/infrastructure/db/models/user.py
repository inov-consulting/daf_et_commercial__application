"""ORM model pour User.

Seules les données applicatives sont persistées.
L'identité (email, prénom, nom) vit dans Keycloak.
"""

from uuid import UUID

from tortoise import fields

from app.domain.shared.user import User
from app.infrastructure.db.base import BaseModel


class UserOrm(BaseModel):
    company_ids = fields.JSONField(default=list)
    is_active = fields.BooleanField(default=True)
    avatar_url = fields.CharField(max_length=1024, null=True, default=None)

    class Meta:
        table = "users"

    def to_domain(self) -> User:
        return User(
            id=self.id,
            company_ids=[UUID(c) for c in self.company_ids] if self.company_ids else [],
            is_active=self.is_active,
            avatar_url=self.avatar_url,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )

    @classmethod
    def from_domain(cls, user: User) -> "UserOrm":
        return cls(
            id=user.id,
            company_ids=[str(c) for c in user.company_ids],
            is_active=user.is_active,
            avatar_url=user.avatar_url,
        )

    def apply_domain(self, user: User) -> None:
        self.company_ids = [str(c) for c in user.company_ids]
        self.is_active = user.is_active
        self.avatar_url = user.avatar_url
