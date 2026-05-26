"""Dépendances FastAPI transverses : repositories, current_user, RBAC."""

from typing import Annotated, Any, Callable
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import TokenError, decode_token
from app.domain.shared.role import Role, has_permission
from app.domain.shared.user import User
from app.infrastructure.db.repositories.company import CompanyRepository
from app.infrastructure.db.repositories.user import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)


# ── Repositories ────────────────────────────────────────────────────────
def get_user_repo() -> UserRepository:
    return UserRepository()


def get_company_repo() -> CompanyRepository:
    return CompanyRepository()


UserRepoDep = Annotated[UserRepository, Depends(get_user_repo)]
CompanyRepoDep = Annotated[CompanyRepository, Depends(get_company_repo)]


# ── Authentification ────────────────────────────────────────────────────
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    user_repo: UserRepoDep,
) -> User:
    try:
        payload = decode_token(token, expected_type="access")
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError) as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token mal formé") from e

    user = await user_repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Utilisateur introuvable ou inactif")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Autorisation (RBAC) ─────────────────────────────────────────────────
def require_role(*allowed: Role) -> Callable[..., Any]:
    """Factory de dépendance : restreint l'accès à une liste de rôles."""

    async def _check(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Rôle requis : {[r.value for r in allowed]}",
            )
        return user

    return _check


def require_permission(permission: str) -> Callable[..., Any]:
    """Factory de dépendance : restreint l'accès via la matrice de permissions."""

    async def _check(user: CurrentUser) -> User:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Permission requise : {permission}",
            )
        return user

    return _check
