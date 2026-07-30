"""ORM model : validateurs métier par entreprise."""
from __future__ import annotations

from uuid import UUID

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class CompanyValidatorsOrm(BaseModel):
    """Validateurs désignés pour chaque entreprise (offres et comptes rendus)."""

    company_id = fields.UUIDField(unique=True, index=True)
    validators_data = fields.JSONField(default=dict)

    class Meta:
        table = "company_validators"

    def get_offer_validator_id(self) -> UUID | None:
        v = (self.validators_data or {}).get("offer_validator_user_id")
        return UUID(v) if v else None

    def get_cr_validator_id(self) -> UUID | None:
        v = (self.validators_data or {}).get("cr_validator_user_id")
        return UUID(v) if v else None
