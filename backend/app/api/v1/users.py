"""Router /users : CRUD utilisateurs."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CompanyRepoDep, UserRepoDep, require_permission
from app.api.v1.schemas.companies import CompanyOut
from app.api.v1.schemas.pagination import Page, PageParams
from app.api.v1.schemas.users import UserCreate, UserOut, UserUpdate
from app.application.users.create_user import CreateUserInput, CreateUserUseCase
from app.application.users.get_user import GetUserUseCase
from app.application.users.list_users import ListUsersUseCase
from app.application.users.update_user import UpdateUserInput, UpdateUserUseCase
from app.infrastructure.auth.keycloak import KeycloakAdminClient

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("user:create"))],
)
async def create_user(
    payload: UserCreate,
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
) -> UserOut:
    user = await CreateUserUseCase(user_repo, company_repo).execute(
        CreateUserInput(
            company_ids=payload.company_ids,
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
        )
    )

    # Créer l'utilisateur dans Keycloak et envoyer l'email de vérification
    try:
        kc = KeycloakAdminClient()
        keycloak_id = await kc.create_user(
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            required_actions=["VERIFY_EMAIL"],
        )
        await kc.send_verify_email(keycloak_id)
    except Exception as exc:
        # Log mais ne pas bloquer la création locale
        import logging
        logging.getLogger(__name__).warning(
            f"Échec création/envoi email Keycloak pour {user.email}: {exc}"
        )

    return UserOut.from_domain(user)


@router.get(
    "",
    response_model=Page[UserOut],
    dependencies=[Depends(require_permission("user:read"))],
)
async def list_users(
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
    company_id: Annotated[UUID, Query(description="Filtrer par entité")],
    params: Annotated[PageParams, Depends()],
) -> Page[UserOut]:
    users = await ListUsersUseCase(user_repo).execute(
        company_id=company_id,
        limit=params.limit,
        offset=params.offset,
    )
    items: list[UserOut] = []
    for u in users:
        companies: list[CompanyOut] = []
        for cid in u.company_ids:
            c = await company_repo.get_by_id(cid)
            if c:
                companies.append(CompanyOut.from_domain(c))
        items.append(UserOut.from_domain(u, companies=companies))
    return Page(items=items, limit=params.limit, offset=params.offset, count=len(items))


@router.get(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_user(
    user_id: UUID, user_repo: UserRepoDep, company_repo: CompanyRepoDep
) -> UserOut:
    user = await GetUserUseCase(user_repo).execute(user_id)
    companies: list[CompanyOut] = []
    for cid in user.company_ids:
        c = await company_repo.get_by_id(cid)
        if c:
            companies.append(CompanyOut.from_domain(c))
    return UserOut.from_domain(user, companies=companies)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_permission("user:update"))],
)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    user_repo: UserRepoDep,
) -> UserOut:
    user = await UpdateUserUseCase(user_repo).execute(
        user_id,
        UpdateUserInput(
            company_ids=payload.company_ids,
            first_name=payload.first_name,
            last_name=payload.last_name,
            is_active=payload.is_active,
        ),
    )
    return UserOut.from_domain(user)
