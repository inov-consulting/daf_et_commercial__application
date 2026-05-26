"""Entité User."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

from app.domain.shared.role import Role


@dataclass(slots=True, kw_only=True)
class User:
    id: UUID
    company_id: UUID
    email: str
    password_hash: str
    role: Role
    first_name: str = ""
    last_name: str = ""
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def new(
        cls,
        *,
        company_id: UUID,
        email: str,
        password_hash: str,
        role: Role,
        first_name: str = "",
        last_name: str = "",
    ) -> "User":
        email_clean = email.strip().lower()
        if "@" not in email_clean or "." not in email_clean:
            raise ValueError(f"Email invalide : {email}")
        return cls(
            id=uuid4(),
            company_id=company_id,
            email=email_clean,
            password_hash=password_hash,
            role=role,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
        )

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.email

    def deactivate(self) -> None:
        self.is_active = False

    def update_password(self, new_password_hash: str) -> None:
        self.password_hash = new_password_hash

    def change_role(self, new_role: Role) -> None:
        self.role = new_role
