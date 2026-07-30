"""ORM model : configuration applicative Portalis (singleton)."""
from __future__ import annotations

from uuid import UUID

from tortoise import fields

from app.domain.shared.app_config import AppConfig, SmtpConfig, ValidatorsConfig
from app.infrastructure.db.base import BaseModel


class AppConfigOrm(BaseModel):
    """Singleton de configuration applicative.

    Les sous-sections sont stockées en JSON pour éviter
    de multiplier les colonnes nullable à chaque évolution.
    """
    validators_data = fields.JSONField(default=dict)
    smtp_data = fields.JSONField(default=dict)

    class Meta:
        table = "app_config"

    def to_domain(self) -> AppConfig:
        v = self.validators_data or {}
        s = self.smtp_data or {}

        offer_vid = v.get("offer_validator_user_id")
        cr_vid = v.get("cr_validator_user_id")

        return AppConfig(
            id=self.id,
            validators=ValidatorsConfig(
                offer_validator_user_id=UUID(offer_vid) if offer_vid else None,
                cr_validator_user_id=UUID(cr_vid) if cr_vid else None,
            ),
            smtp=SmtpConfig(
                host=s.get("host", ""),
                port=s.get("port", 587),
                username=s.get("username", ""),
                password=s.get("password", ""),
                use_tls=s.get("use_tls", True),
                from_email=s.get("from_email", ""),
                from_name=s.get("from_name", "Portalis"),
            ),
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
