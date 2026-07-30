"""Entité User.

L'identité (email, prénom, nom) est gérée par Keycloak.
En base locale on stocke uniquement ce qui est propre à l'application :
- id        : UUID Keycloak (sub du token)
- company_ids : entreprises rattachées (multi-tenant)
- is_active : statut applicatif
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(slots=True, kw_only=True)
class User:
    id: UUID
    company_ids: list[UUID]
    is_active: bool = True
    avatar_url: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # Champs Keycloak — non persistés en DB, populés depuis le token
    email: str = ""
    first_name: str = ""
    last_name: str = ""

    @classmethod
    def new(cls, *, keycloak_id: UUID, company_ids: list[UUID]) -> "User":
        return cls(
            id=keycloak_id,
            company_ids=list(company_ids),
        )

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.email

    def deactivate(self) -> None:
        self.is_active = False
