"""Script utilitaire : synchronise les permissions de l'API avec Keycloak.

Crée les *realm roles* manquants dans Keycloak à partir des permissions
extraites des routers FastAPI.

Usage :
    cd backend && python -m app.scripts.sync_keycloak_roles

Authentification (2 modes possibles) :

1. Password grant (admin-cli du realm master) :
    KEYCLOAK_ADMIN_USER=admin KEYCLOAK_ADMIN_PASSWORD=xxx python -m app.scripts.sync_keycloak_roles

2. Client credentials (service account d'un client admin) :
    KEYCLOAK_ADMIN_CLIENT_ID=portalis-admin KEYCLOAK_ADMIN_CLIENT_SECRET=xxx python -m app.scripts.sync_keycloak_roles
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

import httpx

from app.core.config import settings
from app.scripts.extract_permissions import extract


class KeycloakAdminClient:
    """Client minimal pour l'API Admin Keycloak.

    Supporte deux modes d'authentification :
    - Password grant (admin-cli) via KEYCLOAK_ADMIN_USER / KEYCLOAK_ADMIN_PASSWORD
    - Client credentials via KEYCLOAK_ADMIN_CLIENT_ID / KEYCLOAK_ADMIN_CLIENT_SECRET
    """

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
            payload = resp.json()
        token: str = payload["access_token"]
        self._token = token
        return token

    async def _auth_client_credentials(self) -> str:
        # Le client admin est dans le realm cible (PortaLis)
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
            payload = resp.json()
        token: str = payload["access_token"]
        self._token = token
        return token

    async def _auth_header(self) -> dict[str, str]:
        if self._token is None:
            await self._authenticate()
        return {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}

    async def list_realm_roles(self, realm: str) -> list[dict]:
        """Liste tous les realm roles avec leurs métadonnées."""
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{realm}/roles"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def get_role(self, realm: str, role_name: str) -> dict:
        """Récupère un rôle par son nom."""
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{realm}/roles/{role_name}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def create_realm_role(self, realm: str, role_name: str, composite: bool = False) -> None:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{realm}/roles"
        payload = {"name": role_name, "composite": composite}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 409:
                return  # déjà existant
            resp.raise_for_status()

    async def add_role_composites(self, realm: str, role_name: str, roles: list[dict]) -> None:
        """Ajoute des rôles composites à un rôle existant.

        ``roles`` est une liste de dicts avec au minimum ``id`` et ``name``.
        """
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{realm}/roles/{role_name}/composites"
        payload = [{"id": r["id"], "name": r["name"]} for r in roles]
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()


def _get_admin_credentials() -> tuple[str | None, str | None, str | None, str | None]:
    """Récupère les credentials admin depuis les variables d'environnement ou settings."""
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
    """Vérifie que les credentials sont correctement configurés."""
    if (admin_user and admin_password) or (admin_client_id and admin_client_secret):
        return True
    print(
        "Erreur : définissez soit KEYCLOAK_ADMIN_USER + KEYCLOAK_ADMIN_PASSWORD\n"
        "soit KEYCLOAK_ADMIN_CLIENT_ID + KEYCLOAK_ADMIN_CLIENT_SECRET (dans .env ou env)\n"
        "Exemple : KEYCLOAK_ADMIN_CLIENT_ID=mon-client KEYCLOAK_ADMIN_CLIENT_SECRET=xxx python -m app.scripts.sync_keycloak_roles"
    )
    return False


def _build_desired_roles(desired: dict[str, list[str]]) -> set[str]:
    """Aplatit les permissions en rôles 'resource:action' + rôle admin global."""
    desired_roles: set[str] = {"admin"}
    for resource, actions in desired.items():
        for action in actions:
            desired_roles.add(f"{resource}:{action}")
    return desired_roles


def _print_existing_roles(already: set[str]) -> None:
    """Affiche les rôles déjà existants."""
    if not already:
        return
    print(f"Déjà existants ({len(already)}) :")
    for r in sorted(already):
        print(f"  ✓ {r}")
    print()


async def _create_missing_roles(
    kc: KeycloakAdminClient,
    realm: str,
    to_create: set[str],
) -> None:
    """Crée les rôles manquants dans Keycloak."""
    if not to_create:
        print("Aucun nouveau rôle à créer.\n")
        return
    print(f"À créer ({len(to_create)}) :")
    for role_name in sorted(to_create):
        print(f"  → {role_name}", end=" ")
        is_admin = role_name == "admin"
        await kc.create_realm_role(realm, role_name, composite=is_admin)
        print("[OK]")
    print()


async def _update_admin_composites(
    kc: KeycloakAdminClient,
    realm: str,
    all_roles: list[dict],
) -> None:
    """Met à jour le rôle admin avec tous les rôles d'action comme composites."""
    action_roles = [r for r in all_roles if ":" in r.get("name", "")]
    if not action_roles:
        return
    print(f"Mise à jour du rôle 'admin' : {len(action_roles)} composite(s)")
    try:
        await kc.add_role_composites(realm, "admin", action_roles)
        print("  ✓ Composites ajoutés\n")
    except Exception as exc:
        print(f"  ⚠ Erreur composites : {exc}\n")


def _print_summary(
    realm: str,
    desired_roles: set[str],
    existing_names: set[str],
    to_create: set[str],
) -> None:
    """Affiche le résumé JSON des opérations."""
    summary = {
        "realm": realm,
        "desired": sorted(desired_roles),
        "existing": sorted(existing_names),
        "created": sorted(to_create),
    }
    print("Résumé (JSON) :")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


async def main() -> int:
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
    desired_roles = _build_desired_roles(extract())

    print(f"Realm cible : {realm}")
    print(f"Permissions détectées : {len(desired_roles)}\n")

    all_roles = await kc.list_realm_roles(realm)
    existing_names = {r["name"] for r in all_roles}

    to_create = desired_roles - existing_names
    already = desired_roles & existing_names

    _print_existing_roles(already)
    await _create_missing_roles(kc, realm, to_create)
    await _update_admin_composites(kc, realm, all_roles)
    _print_summary(realm, desired_roles, existing_names, to_create)

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
