"""Client Keycloak — validation JWKS locale et extraction de rôles."""

import asyncio
import logging
import os
import time

import httpx
import jwt
from keycloak import KeycloakOpenID

from app.core.config import settings

logger = logging.getLogger(__name__)


class KeycloakClient:
    """Client HTTP vers Keycloak — validation locale des tokens via JWKS."""

    _jwks_cache: dict | None = None
    _jwks_cache_at: float = 0.0
    _jwks_ttl: int = 3600  # 1 heure

    def __init__(self) -> None:
        self._base_url = f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        self._jwks_url = f"{self._base_url}/protocol/openid-connect/certs"
        # python-keycloak pour l'introspection (méthode officielle)
        server_url = settings.keycloak_url
        if not server_url.endswith("/"):
            server_url += "/"
        self._kc_openid = KeycloakOpenID(
            server_url=server_url,
            client_id=settings.keycloak_client_id,
            realm_name=settings.keycloak_realm,
            client_secret_key=settings.keycloak_client_secret,
            verify=True,
        )

    async def _fetch_jwks(self) -> dict:
        """Télécharge le JWKS depuis Keycloak avec cache (1h TTL)."""
        now = time.time()
        if self._jwks_cache is not None and (now - self._jwks_cache_at) < self._jwks_ttl:
            return self._jwks_cache

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(self._jwks_url)
            resp.raise_for_status()
            KeycloakClient._jwks_cache = resp.json()
            KeycloakClient._jwks_cache_at = now
            logger.info("JWKS mis à jour depuis Keycloak")
            return KeycloakClient._jwks_cache

    async def introspect_token(self, token: str) -> dict | None:
        """Valide un token auprès de Keycloak via python-keycloak introspect.

        Fallback sur validation locale JWKS si Keycloak est injoignable.
        """
        print("Token reçu pour introspection (début) : %s", token[:50])
        try:
            # KeycloakOpenID.introspect est synchrone (requests)
            result: dict = await asyncio.to_thread(
                self._kc_openid.introspect, token
            )
            print("Keycloak introspection response : %s", result)
            if not result.get("active"):
                logger.warning(
                    "Keycloak introspection : token inactif — "
                    "exp=%s iat=%s client_id=%s",
                    result.get("exp"),
                    result.get("iat"),
                    result.get("client_id"),
                )
                return None
            return result
        except Exception as exc:
            logger.warning(
                "Erreur introspection Keycloak (python-keycloak) : %s — fallback JWKS",
                exc,
            )
            return await self._verify_local(token)

    async def _verify_local(self, token: str) -> dict | None:
        """Vérification locale JWT via JWKS (fallback)."""
        try:
            jwks = await self._fetch_jwks()
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")

            key = None
            for jwk in jwks.get("keys", []):
                if jwk.get("kid") == kid:
                    key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
                    break

            if key is None:
                logger.warning("Aucune clé JWKS trouvée pour kid=%s", kid)
                return None

            payload = jwt.decode(
                token,
                key=key,
                algorithms=["RS256"],
                options={"verify_aud": False, "verify_iss": False},
                leeway=3000,  # 5 min de tolérance pour décalages d'horloge
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expiré (fallback JWKS)")
            return None
        except jwt.InvalidTokenError as exc:
            logger.warning("Token invalide (fallback JWKS) : %s", exc)
            return None
        except Exception as exc:
            logger.error("Erreur validation token (fallback JWKS) : %s", exc)
            return None

    @staticmethod
    def extract_roles(payload: dict) -> list[str]:
        """Extrait la liste des realm roles depuis un payload Keycloak."""
        realm_access = payload.get("realm_access", {})
        return realm_access.get("roles", [])

    @staticmethod
    def extract_email(payload: dict) -> str:
        """Extrait et normalise l'email du token."""
        return (payload.get("email", "") or "").strip().lower()

    @staticmethod
    def extract_sub(payload: dict) -> str:
        """Extrait le subject (UUID Keycloak) du token."""
        return payload.get("sub", "")


class KeycloakAdminClient:
    """Client API Admin Keycloak.

    Supporte deux modes d'authentification :
    - Password grant (admin-cli du realm master)
    - Client credentials (service account d'un client dans le realm cible)
    """

    def __init__(self) -> None:
        self._base_url = settings.keycloak_url.rstrip("/")
        self._realm = settings.keycloak_realm
        self._admin_user = os.getenv("KEYCLOAK_ADMIN_USER", "")
        self._admin_password = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "")
        self._admin_client_id = os.getenv("KEYCLOAK_ADMIN_CLIENT_ID") or settings.keycloak_admin_client_id
        self._admin_client_secret = os.getenv("KEYCLOAK_ADMIN_CLIENT_SECRET") or settings.keycloak_admin_client_secret
        self._token: str | None = None

    async def _authenticate(self) -> str:
        if self._admin_client_id and self._admin_client_secret:
            return await self._auth_client_credentials()
        if self._admin_user and self._admin_password:
            return await self._auth_password_grant()
        raise RuntimeError(
            "Aucune méthode d'authentification admin configurée."
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
        url = f"{self._base_url}/realms/{self._realm}/protocol/openid-connect/token"
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

    # ── Realm roles ──────────────────────────────────────────────────────
    async def list_realm_roles(self) -> list[dict]:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/roles"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def get_role(self, role_name: str) -> dict:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/roles/{role_name}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()

    # ── Groups ───────────────────────────────────────────────────────────
    async def list_groups(self) -> list[dict]:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/groups"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.json()

    async def create_group(self, name: str) -> dict:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/groups"
        payload = {"name": name}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 409:
                raise RuntimeError(f"Le groupe '{name}' existe déjà")
            resp.raise_for_status()
        # Keycloak retourne l'ID dans le header Location
        location = resp.headers.get("Location", "")
        group_id = location.split("/")[-1] if location else ""
        return {"id": group_id, "name": name}

    async def delete_group(self, group_id: str) -> None:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/groups/{group_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(url, headers=headers)
            if resp.status_code == 404:
                raise RuntimeError(f"Groupe '{group_id}' introuvable")
            resp.raise_for_status()

    async def get_group_members(self, group_id: str) -> list[dict]:
        """Liste les membres (utilisateurs) d'un groupe."""
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/groups/{group_id}/members"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 404:
                raise RuntimeError(f"Groupe '{group_id}' introuvable")
            resp.raise_for_status()
            return resp.json()

    async def get_group_roles(self, group_id: str) -> list[dict]:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/groups/{group_id}/role-mappings/realm"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 204:
                return []
            resp.raise_for_status()
            return resp.json()

    async def add_group_roles(self, group_id: str, roles: list[dict]) -> None:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/groups/{group_id}/role-mappings/realm"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=roles)
            resp.raise_for_status()

    async def remove_group_roles(self, group_id: str, roles: list[dict]) -> None:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/groups/{group_id}/role-mappings/realm"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(url, headers=headers, json=roles)
            resp.raise_for_status()

    # ── Users ────────────────────────────────────────────────────────────
    async def create_user(
        self,
        email: str,
        first_name: str = "",
        last_name: str = "",
        enabled: bool = True,
        email_verified: bool = False,
        required_actions: list[str] | None = None,
    ) -> str:
        """Crée un utilisateur dans Keycloak et retourne son ID.

        Si l'utilisateur existe déjà (409), retourne l'ID existant
        en le recherchant par email.
        """
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/users"
        payload: dict = {
            "username": email,
            "email": email,
            "firstName": first_name,
            "lastName": last_name,
            "enabled": enabled,
            "emailVerified": email_verified,
        }
        if required_actions:
            payload["requiredActions"] = required_actions

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 409:
                # Utilisateur déjà existant → récupérer son ID
                users = await self.search_users(email)
                for u in users:
                    if u.get("email", "").lower() == email.lower():
                        return u["id"]
                raise RuntimeError(f"Utilisateur '{email}' existe déjà mais ID introuvable")
            resp.raise_for_status()

        location = resp.headers.get("Location", "")
        user_id = location.split("/")[-1] if location else ""
        return user_id

    async def search_users(self, email: str) -> list[dict]:
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/users"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers, params={"email": email})
            resp.raise_for_status()
            return resp.json()

    async def send_verify_email(self, user_id: str) -> None:
        """Envoie l'email de vérification à l'utilisateur."""
        headers = await self._auth_header()
        url = f"{self._base_url}/admin/realms/{self._realm}/users/{user_id}/send-verify-email"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.put(url, headers=headers)
            resp.raise_for_status()
