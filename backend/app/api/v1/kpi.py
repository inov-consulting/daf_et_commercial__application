"""Router API : Indicateurs de performance (KPIs) — lecture seule.

Endpoints :
  GET  /kpi/catalog   → KPIs accessibles selon les groupes de l'utilisateur
  GET  /kpi/{key}     → données AG Charts pour un KPI donné

La configuration des accès (groupe ↔ KPIs) se fait via /config/app/kpi/groups.
"""
from __future__ import annotations

import asyncio
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.api.deps import get_current_user
from app.api.v1.schemas.kpi import KpiCatalogOut, KpiChartData, KpiOut
from app.core.logging import get_logger
from app.domain.shared import kpi_catalog
from app.infrastructure.db.repositories.kpi_group_access import KpiGroupAccessRepository

logger = get_logger(__name__)

router = APIRouter(prefix="/kpi", tags=["kpi"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_admin(request: Request) -> bool:
    """Vérifie si l'utilisateur est super-admin (accès total aux KPIs)."""
    roles: set[str] = getattr(request.state, "keycloak_roles", set())
    return bool(roles & {"admin", "admin_inov"})


def _user_groups(request: Request) -> list[str]:
    """Extrait les IDs de groupes Keycloak depuis le token (claim 'groups')."""
    payload: dict = getattr(request.state, "keycloak_payload", {})
    groups: list = payload.get("groups", [])
    return [g.lstrip("/") if isinstance(g, str) else g for g in groups]


# ── Endpoints utilisateur ──────────────────────────────────────────────────────

@router.get("/catalog")
async def get_kpi_catalog(
    request: Request,
    _user=Depends(get_current_user),
    date_from: Annotated[date | None, Query(description="Début de période (YYYY-MM-DD)")] = None,
    date_to: Annotated[date | None, Query(description="Fin de période (YYYY-MM-DD)")] = None,
) -> KpiCatalogOut:
    """Retourne tous les KPIs accessibles avec leurs données AG Charts en un seul appel.

    Les calculs sont exécutés en parallèle pour minimiser le temps de réponse.
    Un KPI en erreur retourne un chart vide plutôt que de faire échouer la requête.
    """
    if _is_admin(request):
        definitions = kpi_catalog.get_all()
    else:
        group_ids = _user_groups(request)
        allowed_keys = await KpiGroupAccessRepository().get_kpi_keys_for_groups(group_ids)
        definitions = kpi_catalog.filter_by_keys(allowed_keys)

    period = None
    if date_from and date_to:
        period = f"{date_from} → {date_to}"
    elif date_from:
        period = f"depuis {date_from}"
    elif date_to:
        period = f"jusqu'au {date_to}"

    async def _build_kpi_out(defn) -> KpiOut:
        try:
            chart = await _compute_kpi(defn.key, date_from, date_to)
        except Exception as exc:
            logger.warning("kpi.catalog.compute_failed key=%s error=%s", defn.key, exc)
            chart = KpiChartData(data=[], series=[])
        return KpiOut(
            key=defn.key,
            label=defn.label,
            category=defn.category,
            description=defn.description,
            chart=chart,
            unit=defn.unit,
            period=period,
        )

    items = await asyncio.gather(*[_build_kpi_out(d) for d in definitions])
    return KpiCatalogOut(items=list(items), total=len(items))


@router.get("/{key}")
async def get_kpi(
    key: str,
    request: Request,
    _user=Depends(get_current_user),
    date_from: Annotated[date | None, Query(description="Début de période (YYYY-MM-DD)")] = None,
    date_to: Annotated[date | None, Query(description="Fin de période (YYYY-MM-DD)")] = None,
) -> KpiOut:
    """Retourne les données AG Charts pour un KPI donné.

    Vérifie que l'utilisateur appartient à un groupe ayant accès à ce KPI.
    """
    definition = kpi_catalog.get_by_key(key)
    if definition is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"KPI '{key}' inconnu.")

    if not _is_admin(request):
        group_ids = _user_groups(request)
        allowed_keys = await KpiGroupAccessRepository().get_kpi_keys_for_groups(group_ids)
        if key not in allowed_keys:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Votre groupe n'a pas accès à l'indicateur '{key}'.",
            )

    chart = await _compute_kpi(key, date_from, date_to)

    period = None
    if date_from and date_to:
        period = f"{date_from} → {date_to}"
    elif date_from:
        period = f"depuis {date_from}"
    elif date_to:
        period = f"jusqu'au {date_to}"

    return KpiOut(
        key=definition.key,
        label=definition.label,
        category=definition.category,
        description=definition.description,
        chart=chart,
        unit=definition.unit,
        period=period,
    )


# ── Calcul ─────────────────────────────────────────────────────────────────────

async def _compute_kpi(key: str, date_from: date | None, date_to: date | None):
    """Dispatch vers le service de calcul du KPI."""
    try:
        if key == "ca_mois":
            from app.services.kpi.ca_mois import compute
        elif key == "marge_globale":
            from app.services.kpi.marge_globale import compute
        elif key == "marge_dossier":
            from app.services.kpi.marge_dossier import compute
        elif key == "ponctualite":
            from app.services.kpi.ponctualite import compute
        elif key == "dossiers_par_statut":
            from app.services.kpi.dossiers_par_statut import compute
        elif key == "stats_dossiers":
            from app.services.kpi.stats_dossiers import compute
        else:
            raise HTTPException(status_code=404, detail=f"Calcul non implémenté pour '{key}'.")

        return await compute(date_from=date_from, date_to=date_to)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("kpi.compute_failed", key=key, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur lors du calcul de l'indicateur '{key}' : {exc}",
        )
