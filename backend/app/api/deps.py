"""Dépendances FastAPI transverses : repositories, current_user, RBAC."""

import logging
from typing import Annotated

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
    token = credentials.credentials
    logger.info("Header Authorization token (début) : %s", token[:50])
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

    email = kc.extract_email(payload)
    user = await user_repo.get_by_email(email)
    if user is None or not user.is_active:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Utilisateur introuvable ou inactif",
        )
    return user


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
