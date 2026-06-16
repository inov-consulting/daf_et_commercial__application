"""Endpoints pour consulter les logs API (admin/audit)."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentUser, require_permission
from app.api.v1.schemas.api_logs import ApiLogListOut, ApiLogOut
from app.infrastructure.db.models.api_log import ApiRequestLogOrm

router = APIRouter(prefix="/api-logs", tags=["api-logs"])

# Dépendances admin
_admin_deps = [Depends(require_permission("admin"))]


@router.get("", dependencies=_admin_deps)
async def list_api_logs(
    method: Annotated[str | None, Query(description="Filtrer par méthode HTTP: GET, POST, PUT, DELETE")] = None,
    path: Annotated[str | None, Query(description="Filtrer par chemin (contient)")] = None,
    status_code: Annotated[int | None, Query(description="Filtrer par code status HTTP")] = None,
    user_id: Annotated[UUID | None, Query(description="Filtrer par utilisateur")] = None,
    is_error: Annotated[bool | None, Query(description="Filtrer les erreurs uniquement")] = None,
    date_from: Annotated[datetime | None, Query(description="Date de début (ISO 8601)")] = None,
    date_to: Annotated[datetime | None, Query(description="Date de fin (ISO 8601)")] = None,
    limit: Annotated[int, Query(ge=1, le=500, description="Nombre de résultats max")] = 100,
    offset: Annotated[int, Query(ge=0, description="Offset pour pagination")] = 0,
) -> ApiLogListOut:
    """Lister les logs API avec filtres (admin uniquement).

    Exemples:
    - `?method=POST&is_error=true` → erreurs POST
    - `?path=/api/v1/prospects` → requêtes sur prospects
    - `?status_code=500` → erreurs serveur
    - `?date_from=2024-01-01&date_to=2024-01-31` → période spécifique
    """
    query = ApiRequestLogOrm.all()

    # Appliquer les filtres
    if method:
        query = query.filter(method=method.upper())
    if path:
        query = query.filter(path__icontains=path)
    if status_code:
        query = query.filter(status_code=status_code)
    if user_id:
        query = query.filter(user_id=user_id)
    if is_error is not None:
        query = query.filter(is_error=is_error)
    if date_from:
        query = query.filter(created_at__gte=date_from)
    if date_to:
        query = query.filter(created_at__lte=date_to)

    # Compter le total
    total = await query.count()

    # Récupérer les résultats
    logs = await query.order_by("-created_at").offset(offset).limit(limit)

    return ApiLogListOut(
        items=[ApiLogOut.model_validate(log) for log in logs],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{log_id}", dependencies=_admin_deps)
async def get_api_log(log_id: UUID) -> ApiLogOut:
    """Récupérer un log API par son ID (admin uniquement)."""
    log = await ApiRequestLogOrm.get_or_none(id=log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log non trouvé",
        )
    return ApiLogOut.model_validate(log)


@router.get("/{log_id}/details", dependencies=_admin_deps)
async def get_api_log_details(log_id: UUID) -> dict:
    """Récupérer tous les détails d'un log (body, headers complets) + infos utilisateur.

    Endpoint séparé car les détails peuvent être volumineux.
    """
    from app.infrastructure.db.models.user import UserOrm

    log = await ApiRequestLogOrm.get_or_none(id=log_id)
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log non trouvé",
        )

    # Récupérer les infos utilisateur si user_id existe
    user_details = None
    if log.user_id:
        user = await UserOrm.get_or_none(id=log.user_id)
        if user:
            user_details = {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_active": user.is_active,
                "group_id": str(user.group_id) if user.group_id else None,
            }

    return {
        "id": log.id,
        "method": log.method,
        "path": log.path,
        "query_params": log.query_params,
        "request_body": log.request_body,
        "request_headers": log.request_headers,
        "response_body": log.response_body,
        "response_size_bytes": log.response_size_bytes,
        "status_code": log.status_code,
        "duration_ms": log.duration_ms,
        "user_id": log.user_id,
        "user_email": log.user_email,
        "user_details": user_details,
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "is_error": log.is_error,
        "error_message": log.error_message,
        "created_at": log.created_at,
    }
