"""Use case : émettre un nouveau access_token à partir d'un refresh_token valide."""

from uuid import UUID

from app.application.auth.login_user import LoginResult
from app.application.shared.exceptions import AuthenticationError
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.domain.shared.ports.repositories import UserRepository


class RefreshTokenUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, *, refresh_token: str) -> LoginResult:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except TokenError as e:
            raise AuthenticationError(str(e)) from e

        try:
            user_id = UUID(payload["sub"])
        except (KeyError, ValueError) as e:
            raise AuthenticationError("Refresh token mal formé") from e

        user = await self._user_repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("Utilisateur introuvable ou inactif")

        return LoginResult(
            access_token=create_access_token(
                user_id=user.id,
                extra_claims={
                    "role": user.role.value,
                    "company_id": str(user.company_id),
                },
            ),
            refresh_token=create_refresh_token(user_id=user.id),
        )
