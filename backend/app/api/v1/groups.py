"""Router /groups et /permissions — gestion des groupes et rôles Keycloak.

Ces endpoints appellent l'**API Admin Keycloak** ; ils nécessitent
une authentification admin (token admin ou client avec droits admin).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_permission
from app.api.v1.schemas.groups import GroupCreate, GroupRoleAssign
from app.infrastructure.auth.keycloak import KeycloakAdminClient

router = APIRouter(tags=["keycloak"])


@router.get(
    "/groups",
    dependencies=[Depends(require_permission("group:read"))],
)
async def list_groups() -> list[dict]:
    """Liste les groupes Keycloak."""
    kc = KeycloakAdminClient()
    try:
        groups = await kc.list_groups()
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak indisponible : {exc}",
        ) from exc
    return [
        {
            "id": g.get("id", ""),
            "name": g.get("name", ""),
            "path": g.get("path", ""),
        }
        for g in groups
    ]


@router.post(
    "/groups",
    dependencies=[Depends(require_permission("group:read"))],
    status_code=status.HTTP_201_CREATED,
)
async def create_group(payload: GroupCreate) -> dict:
    """Crée un groupe dans Keycloak."""
    kc = KeycloakAdminClient()
    try:
        group = await kc.create_group(payload.name)
    except RuntimeError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak indisponible : {exc}",
        ) from exc
    return group


@router.delete(
    "/groups/{group_id}",
    dependencies=[Depends(require_permission("group:delete"))],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_group(group_id: str) -> None:
    """Supprime un groupe dans Keycloak (bloqué si des utilisateurs y sont rattachés)."""
    kc = KeycloakAdminClient()
    try:
        members = await kc.get_group_members(group_id)
        if members:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"Impossible de supprimer le groupe : {len(members)} utilisateur(s) y sont rattachés",
            )
        await kc.delete_group(group_id)
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak indisponible : {exc}",
        ) from exc


@router.get(
    "/groups/{group_id}/roles",
    dependencies=[Depends(require_permission("group:read"))],
)
async def list_group_roles(group_id: str) -> list[dict]:
    """Liste les rôles assignés à un groupe Keycloak."""
    kc = KeycloakAdminClient()
    try:
        roles = await kc.get_group_roles(group_id)
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak indisponible : {exc}",
        ) from exc
    return [
        {
            "id": r.get("id", ""),
            "name": r.get("name", ""),
            "composite": r.get("composite", False),
        }
        for r in roles
    ]


@router.post(
    "/groups/{group_id}/roles",
    dependencies=[Depends(require_permission("group:update"))],
)
async def assign_roles_to_group(group_id: str, payload: GroupRoleAssign) -> dict:
    """Assigne des rôles realm à un groupe Keycloak.

    ``role_names`` doit contenir les noms des rôles existants.
    """
    kc = KeycloakAdminClient()
    try:
        roles = await kc.list_realm_roles()
        role_map = {r["name"]: r for r in roles if "name" in r}
        to_assign = []
        for name in payload.role_names:
            if name not in role_map:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND,
                    detail=f"Rôle '{name}' introuvable",
                )
            role = role_map[name]
            to_assign.append({"id": role["id"], "name": role["name"]})
        await kc.add_group_roles(group_id, to_assign)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak indisponible : {exc}",
        ) from exc
    return {"group_id": group_id, "assigned": payload.role_names}


@router.delete(
    "/groups/{group_id}/roles/{role_name}",
    dependencies=[Depends(require_permission("group:update"))],
)
async def remove_role_from_group(group_id: str, role_name: str) -> dict:
    """Retire un rôle realm d'un groupe Keycloak."""
    kc = KeycloakAdminClient()
    try:
        role = await kc.get_role(role_name)
        await kc.remove_group_roles(group_id, [{"id": role["id"], "name": role["name"]}])
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak indisponible : {exc}",
        ) from exc
    return {"group_id": group_id, "removed": role_name}


@router.get(
    "/permissions",
    dependencies=[Depends(require_permission("role:read"))],
)
async def list_permissions() -> list[dict]:
    """Liste tous les realm roles (permissions/actions) disponibles."""
    kc = KeycloakAdminClient()
    try:
        roles = await kc.list_realm_roles()
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Keycloak indisponible : {exc}",
        ) from exc
    return [
        {
            "id": r.get("id", ""),
            "name": r.get("name", ""),
            "description": r.get("description", ""),
            "composite": r.get("composite", False),
        }
        for r in roles
    ]
