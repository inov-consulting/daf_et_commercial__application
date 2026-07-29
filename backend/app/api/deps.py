"""Dépendances FastAPI transverses : repositories, current_user, RBAC."""

import logging
from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.domain.shared.company import Company
from app.domain.shared.role import Role
from app.domain.shared.user import User
from app.infrastructure.auth.keycloak import KeycloakClient
from app.infrastructure.db.repositories.company import CompanyRepository
from app.infrastructure.db.repositories.user import UserRepository

logger = logging.getLogger(__name__)
http_bearer = HTTPBearer(auto_error=True)


# ── Repositories ────────────────────────────────────────────────────────
def get_user_repo() -> UserRepository:
    return UserRepository()


def get_company_repo() -> CompanyRepository:
    return CompanyRepository()


UserRepoDep = Annotated[UserRepository, Depends(get_user_repo)]
CompanyRepoDep = Annotated[CompanyRepository, Depends(get_company_repo)]


# ── Authentification (Keycloak) ───────────────────────────────────────
async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(http_bearer)],
    user_repo: UserRepoDep,
) -> User:
    """Construit le User courant depuis le token Keycloak.

    - email, prénom, nom : extraits du payload JWT (source de vérité = Keycloak)
    - company_ids        : récupérés en DB locale si l'enregistrement existe
    - Pas d'erreur si l'utilisateur n'est pas encore en DB (nouveau compte)
    """
    token = credentials.credentials
    logger.debug("Authentification — vérification du token Bearer")
    kc = KeycloakClient()
    try:
        payload = await kc.introspect_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré ou révoqué",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Stocke les rôles et le payload complet (groupes, claims) pour les dépendances
    roles = set(kc.extract_roles(payload))
    request.state.keycloak_roles = roles
    request.state.keycloak_payload = payload

    # Identité depuis le token (source de vérité = Keycloak)
    keycloak_sub = kc.extract_sub(payload)
    try:
        user_id = UUID(keycloak_sub)
    except ValueError:
        logger.warning("sub Keycloak invalide (non-UUID) : %s", keycloak_sub)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    email = kc.extract_email(payload)
    first_name: str = payload.get("given_name", "")
    last_name: str = payload.get("family_name", "")

    # Auto-provisioning : cherche en DB, crée si absent (premier accès)
    company_ids: list[UUID] = []
    try:
        local_user = await user_repo.get_by_id(user_id)
        if local_user is None:
            local_user = await user_repo.add(
                User.new(keycloak_id=user_id, company_ids=[])
            )
            logger.info("Utilisateur auto-provisionné en DB : sub=%s", keycloak_sub)
        company_ids = local_user.company_ids
    except Exception:
        logger.warning("DB indisponible, auto-provisioning ignoré pour sub=%s", keycloak_sub)

    return User(
        id=user_id,
        company_ids=company_ids,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )


CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Entreprise courante (multi-tenant) ──────────────────────────────────────

async def get_current_company(
    x_company_id: Annotated[str | None, Header(alias="X-Company-Id")] = None,
) -> Company:
    """Résout l'entreprise courante depuis le header X-Company-Id.

    Le header doit contenir l'UUID Portalis de la company (table companies).
    Retourne la Company avec son erp_id pour filtrer les appels Odoo.
    Lève 400 si le header est absent, 404 si la company est inconnue.
    """
    if not x_company_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Header X-Company-Id obligatoire.",
        )
    try:
        company_uuid = UUID(x_company_id)
    except ValueError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="X-Company-Id doit être un UUID valide.",
        )

    repo = CompanyRepository()
    company = await repo.get_by_id(company_uuid)
    if company is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Entreprise {x_company_id} introuvable.",
        )
    return company


CurrentCompany = Annotated[Company, Depends(get_current_company)]


# ── Autorisation (RBAC) ─────────────────────────────────────────────────
def require_role(*allowed: Role) -> Callable[..., Any]:
    """Factory de dépendance : restreint l'accès à une liste de rôles."""

    def _check(user: CurrentUser) -> User:
        if getattr(user, "role", None) not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Rôle requis : {[r.value for r in allowed]}",
            )
        return user

    return _check


def require_permission(permission: str) -> Callable[..., Any]:
    """Factory de dépendance : restreint l'accès via la matrice de permissions."""

    def _check(
        request: Request,
        user: CurrentUser,
    ) -> User:
        roles: set[str] = getattr(request.state, "keycloak_roles", set())
        if "admin" not in roles and permission not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Permission requise : {permission}",
            )
        return user

    return _check
