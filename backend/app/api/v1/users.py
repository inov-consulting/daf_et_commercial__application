"""Router /users : CRUD utilisateurs."""

import logging
import time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.deps import CompanyRepoDep, CurrentUser, UserRepoDep, require_permission
from app.api.v1.schemas.companies import CompanyOut
from app.api.v1.schemas.pagination import Page, PageParams
from app.api.v1.schemas.users import ChangePasswordIn, GroupOut, UserCreate, UserOut, UserUpdate
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
        keycloak_id_str = await kc.create_user(
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
        )
        if payload.password:
            # Mot de passe fourni → on le définit directement
            await kc.set_user_password(keycloak_id_str, payload.password, temporary=payload.temporary_password)
        else:
            # Pas de mot de passe → email avec lien de vérification + définition du mot de passe
            await kc.send_required_actions_email(keycloak_id_str, actions=["VERIFY_EMAIL", "UPDATE_PASSWORD"])
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

    # Récupère les groupes de l'utilisateur depuis Keycloak
    kc_groups = await kc.get_user_groups(keycloak_id_str)
    user_groups = [GroupOut(id=g["id"], name=g.get("name", "")) for g in kc_groups]

    # Enrichit avec l'identité connue au moment de la création
    user.email = payload.email
    user.first_name = payload.first_name
    user.last_name = payload.last_name
    companies: list[CompanyOut] = []
    for cid in user.company_ids:
        c = await company_repo.get_by_id(cid)
        if c:
            companies.append(CompanyOut.from_domain(c))
    return UserOut.from_domain(user, companies=companies, groups=user_groups)


@router.get(
    "",
    dependencies=[Depends(require_permission("user:read"))],
)
async def list_users(
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
    params: Annotated[PageParams, Depends()],
) -> Page[UserOut]:
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
        kc_groups = await kc.get_user_groups(str(u.id))
        user_groups = [GroupOut(id=g["id"], name=g.get("name", "")) for g in kc_groups]
        items.append(UserOut.from_domain(u, companies=companies, groups=user_groups))
    return Page(items=items, limit=params.limit, offset=params.offset, count=len(items))


@router.get(
    "/{user_id}",
    dependencies=[Depends(require_permission("user:read"))],
)
async def get_user(
    user_id: UUID, user_repo: UserRepoDep, company_repo: CompanyRepoDep
) -> UserOut:
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
    kc_groups = await kc.get_user_groups(str(user_id))
    user_groups = [GroupOut(id=g["id"], name=g.get("name", "")) for g in kc_groups]
    return UserOut.from_domain(user, companies=companies, groups=user_groups)


@router.patch(
    "/{user_id}/status",
    dependencies=[Depends(require_permission("user:update"))],
)
async def set_user_status(
    user_id: UUID,
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
    is_active: bool,
) -> UserOut:
    """Active ou désactive un utilisateur (synchronisé dans Keycloak).

    Passe `is_active=true` pour activer, `is_active=false` pour désactiver.
    L'état est répercuté à la fois en base locale et dans Keycloak (`enabled`).
    """
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")

    user.is_active = is_active
    user = await user_repo.update(user)

    kc = KeycloakAdminClient()
    try:
        await kc.set_user_enabled(str(user_id), enabled=is_active)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

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

    kc_groups = await kc.get_user_groups(str(user_id))
    return UserOut.from_domain(user, companies=companies, groups=[GroupOut(id=g["id"], name=g.get("name", "")) for g in kc_groups])


@router.delete(
    "/{user_id}/avatar",
    dependencies=[Depends(require_permission("user:update"))],
)
async def delete_user_avatar(
    user_id: UUID,
    user_repo: UserRepoDep,
) -> UserOut:
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")


    user.avatar_url = ""
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

    kc_groups = await kc.get_user_groups(str(user_id))
    
    return UserOut.from_domain(user, companies=companies, groups=[GroupOut(id=g["id"], name=g.get("name", "")) for g in kc_groups])


@router.post(
    "/{user_id}/avatar",
    dependencies=[Depends(require_permission("user:update"))],
)
async def upload_user_avatar(
    user_id: UUID,
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
    file: UploadFile = File(...),
) -> UserOut:
    """Upload ou remplace l'image de profil d'un utilisateur.

    Accepte JPEG, PNG, WEBP (max 5 Mo). L'image est automatiquement
    compressée en WEBP 400×400 px avant stockage dans MinIO.
    """
    _ALLOWED = {"image/jpeg", "image/png", "image/webp"}
    _MAX_BYTES = 5 * 1024 * 1024

    if (file.content_type or "") not in _ALLOWED:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Format non supporté — utilisez JPEG, PNG ou WEBP.",
        )

    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "Fichier trop volumineux (max 5 Mo).",
        )

    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")

    storage = StorageService()
    compressed, ct = StorageService.compress_image(
        data, max_size=(400, 400), quality=85, output_format="WEBP"
    )
    # Clé déterministe → écrase automatiquement l'ancienne image
    url = await storage.upload(
        compressed,
        filename=f"{user_id}.webp",
        content_type=ct,
        folder="avatars",
        unique=False,
    )
    # Cache-buster : même clé MinIO, mais le paramètre ?v= force le navigateur à recharger
    url = f"{url}?v={int(time.time())}"

    user.avatar_url = url
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

    kc_groups = await kc.get_user_groups(str(user_id))
    return UserOut.from_domain(user, companies=companies, groups=[GroupOut(id=g["id"], name=g.get("name", "")) for g in kc_groups])


@router.patch(
    "/{user_id}",
    dependencies=[Depends(require_permission("user:update"))],
)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    user_repo: UserRepoDep,
    company_repo: CompanyRepoDep,
) -> UserOut:
    """Met à jour les données applicatives d'un utilisateur.

    Permet de modifier les entreprises rattachées, les groupes Keycloak,
    le profil (prénom/nom) et le statut actif/inactif.
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

    kc = KeycloakAdminClient()
    user_id_str = str(user_id)

    # Sync prénom/nom vers Keycloak si fournis
    if payload.first_name is not None or payload.last_name is not None:
        try:
            await kc.update_user_profile(
                user_id_str,
                first_name=payload.first_name,
                last_name=payload.last_name,
            )
        except RuntimeError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    # Sync groupes vers Keycloak si fournis
    if payload.group_ids is not None:
        current_groups = await kc.get_user_groups(user_id_str)
        current_ids = {g["id"] for g in current_groups}
        new_ids = set(payload.group_ids)

        # Retrait des groupes abandonnés
        for gid in current_ids - new_ids:
            await kc.remove_user_from_group(user_id_str, gid)

        # Ajout des nouveaux groupes
        for gid in new_ids - current_ids:
            try:
                await kc.add_user_to_group(user_id_str, gid)
            except RuntimeError as exc:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    # Données enrichies depuis Keycloak pour la réponse
    kc_user = await kc.get_user_by_id(user_id_str)
    if kc_user:
        user.email = kc_user.get("email", "")
        user.first_name = kc_user.get("firstName", "")
        user.last_name = kc_user.get("lastName", "")

    companies: list[CompanyOut] = []
    for cid in user.company_ids:
        c = await company_repo.get_by_id(cid)
        if c:
            companies.append(CompanyOut.from_domain(c))

    kc_groups = await kc.get_user_groups(user_id_str)
    user_groups = [GroupOut(id=g["id"], name=g.get("name", "")) for g in kc_groups]

    return UserOut.from_domain(user, companies=companies, groups=user_groups)


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_my_password(
    payload: ChangePasswordIn,
    current_user: CurrentUser,
) -> None:
    """Change le mot de passe de l'utilisateur connecté.

    Vérifie d'abord le mot de passe actuel via Keycloak (ROPC flow) avant
    d'appliquer le nouveau. Retourne 401 si le mot de passe actuel est incorrect.
    """
    kc = KeycloakAdminClient()

    password_ok = await kc.verify_user_password(
        email=current_user.email,
        password=payload.current_password,
    )
    if not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe actuel incorrect.",
        )

    await kc.set_user_password(
        user_id=str(current_user.id),
        password=payload.new_password,
        temporary=False,
    )

