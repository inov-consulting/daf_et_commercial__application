"""Dépendances FastAPI transverses : repositories, current_user, RBAC."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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

    # Stocke les rôles du token pour les dépendances d'autorisation
    roles = set(kc.extract_roles(payload))
    request.state.keycloak_roles = roles

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
        )

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


# ── Autorisation (RBAC) ─────────────────────────────────────────────────
def require_permission(permission: str):
    """Factory de dépendance : vérifie que le rôle action est présent dans le token Keycloak.

    Le rôle ``admin`` bypass toutes les vérifications (super-user).
    """

    async def _check(
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
