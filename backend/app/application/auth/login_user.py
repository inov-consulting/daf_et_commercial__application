"""Use case : authentifier un utilisateur et émettre access + refresh tokens."""

from dataclasses import dataclass

from app.application.shared.exceptions import AuthenticationError
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.domain.shared.ports.repositories import UserRepository


@dataclass(slots=True, frozen=True)
class LoginResult:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginUserUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, *, email: str, password: str) -> LoginResult:
        user = await self._user_repo.get_by_email(email)
        if user is None or not user.is_active:
            # Message volontairement générique pour ne pas révéler l'existence du compte
            raise AuthenticationError("Identifiants invalides")

        if not verify_password(password, user.password_hash):
            raise AuthenticationError("Identifiants invalides")

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
