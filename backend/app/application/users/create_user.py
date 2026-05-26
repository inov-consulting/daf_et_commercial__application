"""Use case : créer un utilisateur (avec hash du mot de passe)."""

from dataclasses import dataclass
from uuid import UUID

from app.application.shared.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.domain.shared.ports.repositories import CompanyRepository, UserRepository
from app.domain.shared.role import Role
from app.domain.shared.user import User


@dataclass(slots=True, frozen=True)
class CreateUserInput:
    company_id: UUID
    email: str
    password: str
    role: Role
    first_name: str = ""
    last_name: str = ""


class CreateUserUseCase:
    def __init__(
        self,
        user_repo: UserRepository,
        company_repo: CompanyRepository,
    ) -> None:
        self._user_repo = user_repo
        self._company_repo = company_repo

    async def execute(self, data: CreateUserInput) -> User:
        company = await self._company_repo.get_by_id(data.company_id)
        if company is None:
            raise NotFoundError(f"Company {data.company_id} introuvable")

        existing = await self._user_repo.get_by_email(data.email)
        if existing is not None:
            raise ConflictError(f"Email déjà utilisé : {data.email}")

        user = User.new(
            company_id=data.company_id,
            email=data.email,
            password_hash=hash_password(data.password),
            role=data.role,
            first_name=data.first_name,
            last_name=data.last_name,
        )
        return await self._user_repo.add(user)
