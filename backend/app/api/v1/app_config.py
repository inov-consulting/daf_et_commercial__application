"""Router API : configuration applicative Portalis.

Endpoints :
  GET  /config/app                    → lire la configuration complète
  PATCH /config/app/validators        → définir les validateurs métier
  PATCH /config/app/smtp              → configurer le serveur SMTP
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.api.v1.schemas.app_config import (
    AppConfigOut,
    AppConfigSmtpIn,
    AppConfigValidatorsIn,
    SmtpConfigOut,
    ValidatorInfo,
    ValidatorsConfigOut,
)
from app.domain.shared.app_config import SmtpConfig, ValidatorsConfig
from app.infrastructure.db.repositories.app_config import AppConfigRepository

router = APIRouter(prefix="/config/app", tags=["configuration"])

_read_deps = [Depends(require_permission("system:configure"))]
_write_deps = [Depends(require_permission("system:configure"))]


async def _resolve_validator(user_id: UUID | None) -> ValidatorInfo | None:
    """Résout un UUID en ValidatorInfo (nom + email) via Keycloak."""
    if user_id is None:
        return None
    try:
        from app.infrastructure.auth.keycloak import KeycloakAdminClient
        kc_user = await KeycloakAdminClient().get_user_by_id(str(user_id))
        if kc_user:
            first = kc_user.get("firstName", "")
            last = kc_user.get("lastName", "")
            display = f"{first} {last}".strip() or kc_user.get("email", str(user_id))
            return ValidatorInfo(
                id=user_id,
                display_name=display,
            )
    except Exception:
        pass
    return ValidatorInfo(id=user_id)


async def _to_out(config) -> AppConfigOut:
    offer_v = await _resolve_validator(config.validators.offer_validator_user_id)
    cr_v = await _resolve_validator(config.validators.cr_validator_user_id)
    return AppConfigOut(
        id=config.id,
        validators=ValidatorsConfigOut(
            offer_validator=offer_v,
            cr_validator=cr_v,
        ),
        smtp=SmtpConfigOut(
            host=config.smtp.host,
            port=config.smtp.port,
            username=config.smtp.username,
            use_tls=config.smtp.use_tls,
            from_email=config.smtp.from_email,
            from_name=config.smtp.from_name,
            password="***" if config.smtp.password else "",
        ),
        updated_at=config.updated_at,
    )


@router.get("", dependencies=_read_deps)
async def get_app_config() -> AppConfigOut:
    """Lit la configuration applicative complète.

    Le mot de passe SMTP est masqué en lecture.
    """
    repo = AppConfigRepository()
    config = await repo.get()
    return await _to_out(config)


@router.patch("/validators", dependencies=_write_deps)
async def update_validators(body: AppConfigValidatorsIn) -> AppConfigOut:
    """Définit les utilisateurs validateurs métier.

    - `offer_validator_user_id` : utilisateur qui doit valider les offres transport
    - `cr_validator_user_id` : utilisateur qui doit valider les CR

    Ces utilisateurs doivent exister dans Portalis.
    L'action de validation (POST /{id}/validate) vérifiera que l'appelant
    correspond à l'utilisateur configuré ici.
    """
    repo = AppConfigRepository()
    config = await repo.set_validators(
        ValidatorsConfig(
            offer_validator_user_id=body.validators.offer_validator_user_id,
            cr_validator_user_id=body.validators.cr_validator_user_id,
        )
    )
    return await _to_out(config)


@router.patch("/smtp", dependencies=_write_deps)
async def update_smtp(body: AppConfigSmtpIn) -> AppConfigOut:
    """Configure le serveur SMTP pour les notifications email."""
    repo = AppConfigRepository()
    config = await repo.set_smtp(
        SmtpConfig(
            host=body.smtp.host,
            port=body.smtp.port,
            username=body.smtp.username,
            password=body.smtp.password,
            use_tls=body.smtp.use_tls,
            from_email=body.smtp.from_email,
            from_name=body.smtp.from_name,
        )
    )
    return await _to_out(config)
