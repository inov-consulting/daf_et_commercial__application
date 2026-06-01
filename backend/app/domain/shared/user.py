"""Entité User."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4

@dataclass(slots=True, kw_only=True)
class User:
    id: UUID
    company_ids: list[UUID]
    email: str
    first_name: str = ""
    last_name: str = ""
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def new(
        cls,
        *,
        company_ids: list[UUID],
        email: str,
        first_name: str = "",
        last_name: str = "",
    ) -> "User":
        email_clean = email.strip().lower()
        if "@" not in email_clean or "." not in email_clean:
            raise ValueError(f"Email invalide : {email}")
        return cls(
            id=uuid4(),
            company_ids=list(company_ids),
            email=email_clean,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
        )

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.email

    def deactivate(self) -> None:
        self.is_active = False
