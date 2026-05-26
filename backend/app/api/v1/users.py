"""Router /users : CRUD utilisateurs."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import CompanyRepoDep, UserRepoDep, require_permission
from app.api.v1.schemas.pagination import Page, PageParams
from app.api.v1.schemas.users import UserCreate, UserOut, UserUpdate
from app.application.users.create_user import CreateUserInput, CreateUserUseCase
from app.application.users.get_user import GetUserUseCase
from app.application.users.list_users import ListUsersUseCase
from app.application.users.update_user import UpdateUserInput, UpdateUserUseCase

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
            company_id=payload.company_id,
            email=payload.email,
            password=payload.password,
            role=payload.role,
            first_name=payload.first_name,
            last_name=payload.last_name,
        )
    )
    return UserOut.from_domain(user)


@router.get(
    "",
    response_model=Page[UserOut],
    dependencies=[Depends(require_permission("user:read_all"))],
)
async def list_users(
    user_repo: UserRepoDep,
    company_id: Annotated[UUID, Query(description="Filtrer par entité")],
    params: Annotated[PageParams, Depends()],
) -> Page[UserOut]:
    users = await ListUsersUseCase(user_repo).execute(
        company_id=company_id,
        limit=params.limit,
        offset=params.offset,
    )
    items = [UserOut.from_domain(u) for u in users]
    return Page(items=items, limit=params.limit, offset=params.offset, count=len(items))


@router.get(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_permission("user:read_all"))],
)
async def get_user(user_id: UUID, user_repo: UserRepoDep) -> UserOut:
    user = await GetUserUseCase(user_repo).execute(user_id)
    return UserOut.from_domain(user)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_permission("user:update_all"))],
)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    user_repo: UserRepoDep,
) -> UserOut:
    user = await UpdateUserUseCase(user_repo).execute(
        user_id,
        UpdateUserInput(
            role=payload.role,
            first_name=payload.first_name,
            last_name=payload.last_name,
            is_active=payload.is_active,
            new_password=payload.new_password,
        ),
    )
    return UserOut.from_domain(user)
