"""Router /auth : authentification et profil utilisateur (Keycloak)."""

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.api.deps import CompanyRepoDep, CurrentUser
from app.api.v1.schemas.companies import CompanyOut
from app.api.v1.schemas.users import UserOut
from app.infrastructure.auth.keycloak import KeycloakAdminClient
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str
    expires_in: int
    refresh_expires_in: int | None = None


@router.post("/token")
async def login(payload: TokenRequest) -> TokenResponse:
    """Échange un login/mot de passe contre des tokens Keycloak (password grant)."""
    url = (
        f"{settings.keycloak_url.rstrip('/')}/"
        f"realms/{settings.keycloak_realm}/protocol/openid-connect/token"
    )
    data = {
        "grant_type": "password",
        "client_id": settings.keycloak_client_id,
        "client_secret": settings.keycloak_client_secret,
        "username": payload.username,
        "password": payload.password,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, data=data)
    if resp.status_code in (400, 401):
        error_body = resp.text
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail=f"{error_body}",
        )
    resp.raise_for_status()
    payload_json = resp.json()
    return TokenResponse(
        access_token=payload_json["access_token"],
        refresh_token=payload_json.get("refresh_token"),
        token_type=payload_json.get("token_type", "Bearer"),
        expires_in=payload_json.get("expires_in", 300),
        refresh_expires_in=payload_json.get("refresh_expires_in"),
    )


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


@router.post("/refresh")
async def refresh(payload: RefreshRequest) -> TokenResponse:
    """Rafraîchit un access_token via un refresh_token."""
    url = (
        f"{settings.keycloak_url.rstrip('/')}/"
        f"realms/{settings.keycloak_realm}/protocol/openid-connect/token"
    )
    data = {
        "grant_type": "refresh_token",
        "client_id": settings.keycloak_client_id,
        "client_secret": settings.keycloak_client_secret,
        "refresh_token": payload.refresh_token,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, data=data)
    if resp.status_code in (400, 401):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail=resp.text,
        )
    resp.raise_for_status()
    payload_json = resp.json()
    return TokenResponse(
        access_token=payload_json["access_token"],
        refresh_token=payload_json.get("refresh_token"),
        token_type=payload_json.get("token_type", "Bearer"),
        expires_in=payload_json.get("expires_in", 300),
        refresh_expires_in=payload_json.get("refresh_expires_in"),
    )


@router.get("/me")
async def me(request: Request, user: CurrentUser, company_repo: CompanyRepoDep) -> UserOut:
    """Retourne le profil de l'utilisateur connecté avec entreprises, groupes et permissions."""
    kc = KeycloakAdminClient()

    # Récupère les données Keycloak
    kc_user = await kc.get_user_by_id(str(user.id))
    if kc_user:
        user.email = kc_user.get("email", "")
        user.first_name = kc_user.get("firstName", "")
        user.last_name = kc_user.get("lastName", "")

    # Récupère les entreprises
    companies: list[CompanyOut] = []
    for cid in user.company_ids:
        c = await company_repo.get_by_id(cid)
        if c:
            companies.append(CompanyOut.from_domain(c))

    # Récupère les groupes
    kc_groups = await kc.get_user_groups(str(user.id))
    user_group_ids = [g["id"] for g in kc_groups]

    # Permissions extraites du JWT par get_current_user (realm_access.roles)
    roles: set[str] = getattr(request.state, "keycloak_roles", set())
    permissions = sorted(roles)

    return UserOut.from_domain(user, companies=companies, group_ids=user_group_ids, permissions=permissions)
