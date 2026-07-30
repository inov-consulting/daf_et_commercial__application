"""Repository : validateurs par entreprise."""
from __future__ import annotations

from uuid import UUID

from app.infrastructure.db.models.company_validators import CompanyValidatorsOrm


class CompanyValidatorsRepository:

    async def get(self, company_id: UUID) -> CompanyValidatorsOrm | None:
        return await CompanyValidatorsOrm.get_or_none(company_id=company_id)

    async def get_all(self) -> list[CompanyValidatorsOrm]:
        return await CompanyValidatorsOrm.all()

    async def set(
        self,
        company_id: UUID,
        offer_validator_user_id: UUID | None,
        cr_validator_user_id: UUID | None,
    ) -> CompanyValidatorsOrm:
        data = {}
        if offer_validator_user_id is not None:
            data["offer_validator_user_id"] = str(offer_validator_user_id)
        if cr_validator_user_id is not None:
            data["cr_validator_user_id"] = str(cr_validator_user_id)

        obj, _ = await CompanyValidatorsOrm.update_or_create(
            company_id=company_id,
            defaults={"validators_data": data},
        )
        return obj

    async def get_offer_validator(self, company_id: UUID) -> UUID | None:
        obj = await self.get(company_id)
        return obj.get_offer_validator_id() if obj else None

    async def get_cr_validator(self, company_id: UUID) -> UUID | None:
        obj = await self.get(company_id)
        return obj.get_cr_validator_id() if obj else None
