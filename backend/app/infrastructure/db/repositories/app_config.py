"""Repository : configuration applicative Portalis."""
from __future__ import annotations

from uuid import uuid4

from app.domain.shared.app_config import AppConfig, SmtpConfig, ValidatorsConfig
from app.infrastructure.db.models.app_config import AppConfigOrm


class AppConfigRepository:

    async def _get_or_create(self) -> AppConfigOrm:
        orm = await AppConfigOrm.first()
        if orm is None:
            orm = await AppConfigOrm.create(id=uuid4())
        return orm

    async def get(self) -> AppConfig:
        orm = await self._get_or_create()
        return orm.to_domain()

    async def set_validators(self, validators: ValidatorsConfig) -> AppConfig:
        orm = await self._get_or_create()
        orm.validators_data = {
            "offer_validator_user_id": str(validators.offer_validator_user_id)
            if validators.offer_validator_user_id else None,
            "cr_validator_user_id": str(validators.cr_validator_user_id)
            if validators.cr_validator_user_id else None,
        }
        await orm.save()
        return orm.to_domain()

    async def set_smtp(self, smtp: SmtpConfig) -> AppConfig:
        orm = await self._get_or_create()
        orm.smtp_data = {
            "host": smtp.host,
            "port": smtp.port,
            "username": smtp.username,
            "password": smtp.password,
            "use_tls": smtp.use_tls,
            "from_email": smtp.from_email,
            "from_name": smtp.from_name,
        }
        await orm.save()
        return orm.to_domain()
