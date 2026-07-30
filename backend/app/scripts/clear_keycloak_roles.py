"""Script utilitaire : supprime de Keycloak les realm roles créés par FastAPI.

Par défaut, lit les permissions définies dans les routers FastAPI (via extract_permissions)
et supprime les rôles correspondants.

Avec --from-keycloak, supprime TOUS les rôles applicatifs présents dans Keycloak
(utile pour nettoyer des anciens rôles renommés/supprimés des routes).

Usage :
    cd backend && python -m app.scripts.clear_keycloak_roles              # depuis les routes
    cd backend && python -m app.scripts.clear_keycloak_roles --from-keycloak  # depuis Keycloak
    cd backend && python -m app.scripts.clear_keycloak_roles --yes        # sans confirmation
    cd backend && python -m app.scripts.clear_keycloak_roles --dry-run    # aperçu sans supprimer

Authentification (2 modes possibles) :

1. Password grant (admin-cli du realm master) :
    KEYCLOAK_ADMIN_USER=admin KEYCLOAK_ADMIN_PASSWORD=xxx python -m app.scripts.clear_keycloak_roles

2. Client credentials (service account d'un client admin) :
    KEYCLOAK_ADMIN_CLIENT_ID=portalis-admin KEYCLOAK_ADMIN_CLIENT_SECRET=xxx python -m app.scripts.clear_keycloak_roles
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

import httpx

from app.core.config import settings
from app.scripts.extract_permissions import extract


class KeycloakAdminClient:
    def __init__(
        self,
        base_url: str,
        admin_user: str | None = None,
        admin_password: str | None = None,
        admin_client_id: str | None = None,
        admin_client_secret: str | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._admin_user = admin_user
        self._admin_password = admin_password
        self._admin_client_id = admin_client_id
        self._admin_client_secret = admin_client_secret
        self._token: str | None = None

    async def _authenticate(self) -> str:
        if self._admin_client_id and self._admin_client_secret:
            return await self._auth_client_credentials()
        if self._admin_user and self._admin_password:
            return await self._auth_password_grant()
        raise RuntimeError(
            "Aucune méthode d'authentification configurée. "
            "Définissez KEYCLOAK_ADMIN_USER + KEYCLOAK_ADMIN_PASSWORD "
            "ou KEYCLOAK_ADMIN_CLIENT_ID + KEYCLOAK_ADMIN_CLIENT_SECRET"
        )

    async def _auth_password_grant(self) -> str:
        url = f"{self._base_url}/realms/master/protocol/openid-connect/token"
        data = {
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": self._admin_user,
            "password": self._admin_password,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, data=data)
            resp.raise_for_status()
        token: str = resp.json()["access_token"]
        self._token = token
        return token

    async def _auth_client_credentials(self) -> str:
        realm = settings.keycloak_realm
        url = f"{self._base_url}/realms/{realm}/protocol/openid-connect/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self._admin_client_id,
            "client_secret": self._admin_client_secret,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, data=data)
            resp.raise_for_status()
        token: str = resp.json()["access_token"]
        self._token = token
        return token

    async def _auth_header(self) -> dict[str, str]:
        if self._token is None:
            await self._authenticate()
        return {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}

    async def list_realm_roles(self, realm: str) -> list[dict]:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{realm}/roles"
        params = {"max": 1000}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            return resp.json()

    async def delete_realm_role(self, realm: str, role_name: str) -> str:
        """Supprime un realm role.

        Returns:
            "deleted"   — rôle supprimé avec succès
            "not_found" — rôle inexistant dans Keycloak
        """
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{realm}/roles/{role_name}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(url, headers=headers)
        if resp.status_code == 204:
            return "deleted"
        if resp.status_code == 404:
            return "not_found"
        resp.raise_for_status()
        return "deleted"


def _get_admin_credentials() -> tuple[str | None, str | None, str | None, str | None]:
    admin_user = os.getenv("KEYCLOAK_ADMIN_USER")
    admin_password = os.getenv("KEYCLOAK_ADMIN_PASSWORD")
    admin_client_id = os.getenv("KEYCLOAK_ADMIN_CLIENT_ID") or settings.keycloak_admin_client_id
    admin_client_secret = os.getenv("KEYCLOAK_ADMIN_CLIENT_SECRET") or settings.keycloak_admin_client_secret
    return admin_user, admin_password, admin_client_id, admin_client_secret


def _validate_credentials(
    admin_user: str | None,
    admin_password: str | None,
    admin_client_id: str | None,
    admin_client_secret: str | None,
) -> bool:
    if (admin_user and admin_password) or (admin_client_id and admin_client_secret):
        return True
    print(
        "Erreur : définissez soit KEYCLOAK_ADMIN_USER + KEYCLOAK_ADMIN_PASSWORD\n"
        "soit KEYCLOAK_ADMIN_CLIENT_ID + KEYCLOAK_ADMIN_CLIENT_SECRET (dans .env ou env)"
    )
    return False


# Rôles internes Keycloak à ne jamais supprimer
_KEYCLOAK_BUILTIN_PREFIXES = ("default-roles-", "uma_authorization", "offline_access")


def _build_roles_from_routes() -> set[str]:
    """Construit la liste des rôles à partir des routes FastAPI actuelles."""
    roles: set[str] = {"admin"}
    for resource, actions in extract().items():
        for action in actions:
            roles.add(f"{resource}:{action}")
    return roles


def _build_roles_from_keycloak(all_kc_roles: list[dict]) -> set[str]:
    """Retourne tous les rôles applicatifs présents dans Keycloak (hors built-in)."""
    roles: set[str] = set()
    for role in all_kc_roles:
        name: str = role.get("name", "")
        if any(name.startswith(prefix) or name == prefix for prefix in _KEYCLOAK_BUILTIN_PREFIXES):
            continue
        roles.add(name)
    return roles


async def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Supprimer les realm roles FastAPI de Keycloak")
    parser.add_argument(
        "--from-keycloak",
        action="store_true",
        help="Supprime TOUS les rôles applicatifs de Keycloak (y compris anciens/renommés)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Affiche ce qui serait supprimé sans le faire")
    parser.add_argument("--yes", "-y", action="store_true", help="Ne pas demander de confirmation")
    args = parser.parse_args(argv)

    admin_user, admin_password, admin_client_id, admin_client_secret = _get_admin_credentials()
    if not _validate_credentials(admin_user, admin_password, admin_client_id, admin_client_secret):
        return 1

    kc = KeycloakAdminClient(
        base_url=settings.keycloak_url,
        admin_user=admin_user,
        admin_password=admin_password,
        admin_client_id=admin_client_id,
        admin_client_secret=admin_client_secret,
    )

    realm = settings.keycloak_realm

    if args.from_keycloak:
        print("Mode : depuis Keycloak (tous les rôles applicatifs existants)\n")
        all_kc_roles = await kc.list_realm_roles(realm)
        roles_to_delete = _build_roles_from_keycloak(all_kc_roles)
    else:
        print("Mode : depuis les routes FastAPI (permissions actuelles)\n")
        roles_to_delete = _build_roles_from_routes()

    print(f"Realm cible       : {realm}")
    print(f"Rôles à supprimer : {len(roles_to_delete)}")
    print()
    for name in sorted(roles_to_delete):
        print(f"  - {name}")
    print()

    if args.dry_run:
        print("Mode dry-run : aucune suppression effectuée.")
        return 0

    if not args.yes:
        confirm = input(f"Supprimer ces {len(roles_to_delete)} rôles du realm '{realm}' ? [y/N] ").strip().lower()
        if confirm not in ("y", "yes", "o", "oui"):
            print("Annulé.")
            return 0

    deleted: list[str] = []
    not_found: list[str] = []
    failed: list[tuple[str, str]] = []

    print("Suppression en cours...")
    for role_name in sorted(roles_to_delete):
        print(f"  → {role_name}", end=" ", flush=True)
        try:
            result = await kc.delete_realm_role(realm, role_name)
            if result == "deleted":
                print("[OK]")
                deleted.append(role_name)
            else:
                print("[introuvable]")
                not_found.append(role_name)
        except Exception as exc:
            print(f"[ERREUR: {exc}]")
            failed.append((role_name, str(exc)))

    print()
    summary = {
        "realm": realm,
        "deleted": deleted,
        "not_found": not_found,
        "failed": {name: err for name, err in failed},
    }
    print("Résumé (JSON) :")
    print(json.dumps(summary, indent=2, ensure_ascii=False))

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
