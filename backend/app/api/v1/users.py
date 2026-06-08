"""Router /users : CRUD utilisateurs."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CompanyRepoDep, UserRepoDep, require_permission
from app.api.v1.schemas.companies import CompanyOut
from app.api.v1.schemas.pagination import Page, PageParams
from app.api.v1.schemas.users import UserCreate, UserOut, UserUpdate
from app.application.users.create_user import CreateUserInput, CreateUserUseCase
from app.application.users.get_user import GetUserUseCase
from app.application.users.list_users import ListUsersUseCase
from app.application.users.update_user import UpdateUserInput, UpdateUserUseCase
from app.infrastructure.auth.keycloak import KeycloakAdminClient

logger = logging.getLogger(__name__)
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
    # Résolution du keycloak_id depuis l'email via l'admin Keycloak
    kc = KeycloakAdminClient()
    users_kc = await kc.search_users(payload.email)
    keycloak_user = next(
        (u for u in users_kc if u.get("email", "").lower() == payload.email.lower()),
        None,
    )
    if keycloak_user is None:
        # Utilisateur absent de Keycloak → on le crée
        keycloak_id_str = await kc.create_user(
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            required_actions=["VERIFY_EMAIL"],
        )
        await kc.send_verify_email(keycloak_id_str)
        logger.info("Utilisateur créé dans Keycloak : %s", payload.email)
    else:
        keycloak_id_str = keycloak_user["id"]

    try:
        keycloak_id = UUID(keycloak_id_str)
    except ValueError:
        logger.error("ID Keycloak invalide pour %s : %s", payload.email, keycloak_id_str)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Réponse Keycloak invalide") from None

    user = await CreateUserUseCase(user_repo, company_repo).execute(
        CreateUserInput(
            keycloak_id=keycloak_id,
            company_ids=payload.company_ids,
        )
    )
    # Enrichit avec l'identité connue au moment de la création
    user.email = payload.email
    user.first_name = payload.first_name
    user.last_name = payload.last_name
    return UserOut.from_domain(user)


@router.get(
    "",
    response_model=Page[UserOut],
    dependencies=[Depends(require_permission("user:read"))],
)
async def list_users(
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
    params: Annotated[PageParams, Depends()],
) -> Page[UserOut]:
    users = await ListUsersUseCase(user_repo).execute(
        limit=params.limit,
        offset=params.offset,
    )
    items: list[UserOut] = []
    for u in users:
        companies: list[CompanyOut] = []
        for cid in u.company_ids:
            c = await company_repo.get_by_id(cid)
            if c:
                company_ids.append(cid)
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
