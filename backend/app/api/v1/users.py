"""Router /users : CRUD utilisateurs."""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.deps import CompanyRepoDep, UserRepoDep, require_permission
from app.api.v1.schemas.companies import CompanyOut
from app.api.v1.schemas.pagination import Page, PageParams
from app.api.v1.schemas.users import UserCreate, UserOut, UserUpdate
from app.application.users.create_user import CreateUserInput, CreateUserUseCase
from app.application.users.get_user import GetUserUseCase
from app.application.users.list_users import ListUsersUseCase
from app.application.users.update_user import UpdateUserInput, UpdateUserUseCase
from app.infrastructure.auth.keycloak import KeycloakAdminClient
from app.infrastructure.storage.minio import StorageService

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
    """Crée un utilisateur dans Keycloak et en base locale.

    Si l'utilisateur n'existe pas encore dans Keycloak, il est créé et
    rattaché aux groupes fournis. Si un mot de passe est fourni, il est
    défini directement (temporaire ou non) ; sinon un email de vérification
    est envoyé. L'utilisateur est ensuite associé aux entreprises indiquées.
    """
    # Résolution du keycloak_id depuis l'email via l'admin Keycloak
    kc = KeycloakAdminClient()
    users_kc = await kc.search_users(payload.email)
    keycloak_user = next(
        (u for u in users_kc if u.get("email", "").lower() == payload.email.lower()),
        None,
    )
    if keycloak_user is None:
        # Utilisateur absent de Keycloak → on le crée
        required_actions = [] if payload.password else ["VERIFY_EMAIL"]
        keycloak_id_str = await kc.create_user(
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            required_actions=required_actions,
        )
        if payload.password:
            await kc.set_user_password(keycloak_id_str, payload.password, temporary=payload.temporary_password)
        else:
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

    for group_id in payload.group_ids:
        try:
            await kc.add_user_to_group(keycloak_id_str, group_id)
        except RuntimeError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    # Enrichit avec l'identité connue au moment de la création
    user.email = payload.email
    user.first_name = payload.first_name
    user.last_name = payload.last_name
    companies: list[CompanyOut] = []
    for cid in user.company_ids:
        c = await company_repo.get_by_id(cid)
        if c:
            companies.append(CompanyOut.from_domain(c))
    return UserOut.from_domain(user, companies=companies)


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
    """Liste tous les utilisateurs avec pagination.

    Les données d'identité (email, prénom, nom) sont enrichies depuis Keycloak
    pour chaque utilisateur. Les entreprises rattachées sont également résolues.
    """
    kc = KeycloakAdminClient()
    users = await ListUsersUseCase(user_repo).execute(
        limit=params.limit,
        offset=params.offset,
    )
    items: list[UserOut] = []
    for u in users:
        kc_user = await kc.get_user_by_id(str(u.id))
        if kc_user:
            u.email = kc_user.get("email", "")
            u.first_name = kc_user.get("firstName", "")
            u.last_name = kc_user.get("lastName", "")
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
    """Récupère un utilisateur par son ID Keycloak.

    Les données d'identité (email, prénom, nom) sont enrichies depuis Keycloak.
    Retourne 404 si l'utilisateur est introuvable en base locale.
    """
    kc = KeycloakAdminClient()
    user = await GetUserUseCase(user_repo).execute(user_id)
    kc_user = await kc.get_user_by_id(str(user_id))
    if kc_user:
        user.email = kc_user.get("email", "")
        user.first_name = kc_user.get("firstName", "")
        user.last_name = kc_user.get("lastName", "")
    companies: list[CompanyOut] = []
    for cid in user.company_ids:
        c = await company_repo.get_by_id(cid)
        if c:
            companies.append(CompanyOut.from_domain(c))
    return UserOut.from_domain(user, companies=companies)


@router.post(
    "/{user_id}/avatar",
    response_model=UserOut,
    dependencies=[Depends(require_permission("user:update"))],
)
async def upload_avatar(
    user_id: UUID,
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
    file: UploadFile = File(...),
) -> UserOut:
    """Upload ou remplace la photo de profil d'un utilisateur.

    L'image est automatiquement redimensionnée (max 400×400 px) et convertie
    en WebP qualité 85 avant stockage sur MinIO.
    Formats acceptés : JPEG, PNG, WebP, GIF.
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.",
        )

    data = await file.read()
    compressed, content_type = StorageService.compress_image(
        data, max_size=(400, 400), quality=85, output_format="WEBP"
    )

    storage = StorageService()
    avatar_url = await storage.upload(
        compressed,
        filename=f"{user_id}.webp",
        content_type=content_type,
        folder="avatars",
        unique=False,
    )

    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    user.avatar_url = avatar_url
    user = await user_repo.update(user)

    kc = KeycloakAdminClient()
    kc_user = await kc.get_user_by_id(str(user_id))
    if kc_user:
        user.email = kc_user.get("email", "")
        user.first_name = kc_user.get("firstName", "")
        user.last_name = kc_user.get("lastName", "")
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
    """Met à jour les données applicatives d'un utilisateur.

    Permet de modifier les entreprises rattachées, le statut actif/inactif.
    Les champs non fournis (null) sont ignorés.
    """
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
