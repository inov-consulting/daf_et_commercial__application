"""Router /auth : authentification et profil utilisateur (Keycloak)."""

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser
from app.api.v1.schemas.users import UserOut
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


@router.post("/token", response_model=TokenResponse)
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


@router.post("/refresh", response_model=TokenResponse)
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


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.from_domain(user)
