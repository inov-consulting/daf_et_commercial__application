"""Router /auth : login, refresh, me."""

from fastapi import APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated

from fastapi import Depends

from app.api.deps import CurrentUser, UserRepoDep
from app.api.v1.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.api.v1.schemas.users import UserOut
from app.application.auth.login_user import LoginUserUseCase
from app.application.auth.refresh_token import RefreshTokenUseCase

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, user_repo: UserRepoDep) -> TokenResponse:
    result = await LoginUserUseCase(user_repo).execute(
        email=payload.email,
        password=payload.password,
    )
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
    )


@router.post("/login/oauth", response_model=TokenResponse, include_in_schema=False)
async def login_oauth_form(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    user_repo: UserRepoDep,
) -> TokenResponse:
    """Variante compatible avec le flow OAuth2 password (utile pour Swagger UI)."""
    result = await LoginUserUseCase(user_repo).execute(
        email=form.username,
        password=form.password,
    )
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, user_repo: UserRepoDep) -> TokenResponse:
    result = await RefreshTokenUseCase(user_repo).execute(refresh_token=payload.refresh_token)
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
    )


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.from_domain(user)
