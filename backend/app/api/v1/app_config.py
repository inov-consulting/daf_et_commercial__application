"""Router API : configuration applicative Portalis.

Endpoints :
  GET  /config/app                          → lire la configuration complète
  PATCH /config/app/validators              → définir les validateurs métier
  PATCH /config/app/smtp                    → configurer le serveur SMTP
  GET  /config/app/kpi/groups               → lire les mappings groupe ↔ KPIs
  PUT  /config/app/kpi/groups/{group_id}    → assigner des KPIs à un groupe
  DELETE /config/app/kpi/groups/{group_id}  → supprimer le mapping d'un groupe
  GET  /config/app/kpi/available            → catalogue complet des KPIs disponibles
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import require_permission
from app.api.v1.schemas.app_config import (
    AppConfigOut,
    AppConfigSmtpIn,
    AppConfigValidatorsIn,
    CompanyValidatorsIn,
    CompanyValidatorsOut,
    SmtpConfigOut,
    ValidatorInfo,
    ValidatorsConfigOut,
)
from app.domain.shared import kpi_catalog
from app.domain.shared.app_config import SmtpConfig, ValidatorsConfig
from app.infrastructure.db.repositories.app_config import AppConfigRepository
from app.infrastructure.db.repositories.company_validators import CompanyValidatorsRepository
from app.infrastructure.db.repositories.kpi_group_access import KpiGroupAccessRepository

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


# ── Validateurs par entreprise ────────────────────────────────────────────────

async def _company_validators_to_out(company_id: UUID, obj) -> CompanyValidatorsOut:
    offer_v = await _resolve_validator(obj.get_offer_validator_id() if obj else None)
    cr_v = await _resolve_validator(obj.get_cr_validator_id() if obj else None)
    return CompanyValidatorsOut(
        company_id=company_id,
        offer_validator=offer_v,
        cr_validator=cr_v,
    )


@router.get("/validators/companies", dependencies=_read_deps)
async def list_company_validators() -> list[CompanyValidatorsOut]:
    """Liste les validateurs configurés pour toutes les entreprises."""
    repo = CompanyValidatorsRepository()
    rows = await repo.get_all()
    result = []
    for row in rows:
        result.append(await _company_validators_to_out(row.company_id, row))
    return result


@router.get("/validators/companies/{company_id}", dependencies=_read_deps)
async def get_company_validators(company_id: UUID) -> CompanyValidatorsOut:
    """Lit les validateurs configurés pour une entreprise donnée."""
    repo = CompanyValidatorsRepository()
    obj = await repo.get(company_id)
    return await _company_validators_to_out(company_id, obj)


@router.patch("/validators/companies/{company_id}", dependencies=_write_deps)
async def set_company_validators(
    company_id: UUID,
    body: CompanyValidatorsIn,
) -> CompanyValidatorsOut:
    """Définit les validateurs d'une entreprise.

    - `offer_validator_user_id` : utilisateur qui valide les offres de cette entreprise
    - `cr_validator_user_id`    : utilisateur qui valide les CR de cette entreprise

    Ces validateurs prennent le dessus sur la config globale pour cette entreprise.
    """
    repo = CompanyValidatorsRepository()
    obj = await repo.set(
        company_id=company_id,
        offer_validator_user_id=body.offer_validator_user_id,
        cr_validator_user_id=body.cr_validator_user_id,
    )
    return await _company_validators_to_out(company_id, obj)


# ── Configuration KPI : mapping groupe ↔ KPIs ─────────────────────────────────


class GroupKpiAccessIn(BaseModel):
    group_name: str = Field(description="Nom lisible du groupe (pour affichage)")
    kpi_keys: list[str] = Field(description="Liste des clés KPI autorisées pour ce groupe")


class GroupKpiAccessOut(BaseModel):
    group_id: str
    group_name: str
    kpi_keys: list[str]


class KpiAvailableOut(BaseModel):
    key: str
    label: str
    category: str
    description: str | None = None
    unit: str | None = None


@router.get("/kpi/available", dependencies=_read_deps)
async def list_available_kpis() -> list[KpiAvailableOut]:
    """Liste tous les KPIs disponibles dans l'application (catalogue complet).

    Utile pour connaître les clés à assigner aux groupes.
    """
    return [
        KpiAvailableOut(
            key=k.key,
            label=k.label,
            category=k.category,
            description=k.description,
            unit=k.unit,
        )
        for k in kpi_catalog.get_all()
    ]


@router.get("/kpi/groups", dependencies=_read_deps)
async def list_group_kpi_access() -> list[GroupKpiAccessOut]:
    """Liste tous les mappings groupe ↔ KPIs configurés."""
    repo = KpiGroupAccessRepository()
    records = await repo.get_all()
    return [
        GroupKpiAccessOut(
            group_id=r.group_id,
            group_name=r.group_name,
            kpi_keys=r.kpi_keys or [],
        )
        for r in records
    ]


@router.put("/kpi/groups/{group_id}", dependencies=_write_deps)
async def set_group_kpi_access(group_id: str, body: GroupKpiAccessIn) -> GroupKpiAccessOut:
    """Assigne une liste de KPIs à un groupe Keycloak.

    - `group_id`   : ID du groupe dans Keycloak
    - `group_name` : nom lisible (pour affichage)
    - `kpi_keys`   : clés KPI autorisées (ex: ["ca_mois", "marge_globale"])

    Les clés inconnues sont ignorées silencieusement.
    """
    valid_keys = kpi_catalog.get_all_keys()
    filtered_keys = [k for k in body.kpi_keys if k in valid_keys]

    repo = KpiGroupAccessRepository()
    record = await repo.set_group_access(
        group_id=group_id,
        group_name=body.group_name,
        kpi_keys=filtered_keys,
    )
    return GroupKpiAccessOut(
        group_id=record.group_id,
        group_name=record.group_name,
        kpi_keys=record.kpi_keys or [],
    )


@router.delete("/kpi/groups/{group_id}", dependencies=_write_deps, status_code=204)
async def delete_group_kpi_access(group_id: str) -> None:
    """Supprime le mapping KPI d'un groupe."""
    repo = KpiGroupAccessRepository()
    deleted = await repo.delete_group_access(group_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Groupe '{group_id}' non configuré.")
