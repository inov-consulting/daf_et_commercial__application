"""Client Odoo via XML-RPC.

Permet de récupérer la liste des entreprises (res.company) depuis Odoo
pour synchronisation avec la base locale.
"""

from __future__ import annotations

import xmlrpc.client
from dataclasses import dataclass
from uuid import UUID, uuid5

from app.core.config import settings

# Namespace fixe pour générer des UUID stables depuis l'ID Odoo
ODOO_UUID_NS = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


@dataclass(slots=True, frozen=True)
class OdooCompany:
    """Représentation simplifiée d'une entreprise Odoo."""

    id: int               # ID Odoo
    name: str
    currency: str | None
    country_name: str | None  # nom du pays tel que retourné par Odoo
    parent_id: int | None

    @property
    def uuid(self) -> UUID:
        """Génère un UUID stable et reproductible depuis l'ID Odoo."""
        return uuid5(ODOO_UUID_NS, f"odoo:company:{self.id}")


def _extract_odoo_field(record: dict, field: str) -> str | int | None:
    """Extrait la valeur d'un champ many2one Odoo (liste [id, name] ou valeur brute)."""
    value = record.get(field)
    if not value:
        return None
    if isinstance(value, list):
        return value[1] if field != "parent_id" else value[0]
    return int(value) if field == "parent_id" else str(value)


class OdooClient:
    """Client XML-RPC vers un serveur Odoo.
    
    Supporte l'authentification par API key (prioritaire) ou username/password.
    """

    def __init__(self) -> None:
        self._url = settings.odoo_url.rstrip("/")
        self._db = settings.odoo_db
        self._api_key = settings.odoo_api_key
        self._username = settings.odoo_username
        self._password = settings.odoo_password
        self._uid: int | None = None

    def _common_proxy(self) -> xmlrpc.client.ServerProxy:
        return xmlrpc.client.ServerProxy(f"{self._url}/xmlrpc/2/common")

    def _object_proxy(self) -> xmlrpc.client.ServerProxy:
        return xmlrpc.client.ServerProxy(f"{self._url}/xmlrpc/2/object")

    def _authenticate(self) -> int:
        if self._uid is not None:
            return self._uid
        common = self._common_proxy()
        uid = common.authenticate(self._db, self._username, self._password, {})
        if not uid:
            raise RuntimeError("Authentification Odoo échouée")
        self._uid = uid
        return uid

    def list_companies(self) -> list[OdooCompany]:
        """Récupère toutes les entreprises actives depuis Odoo."""
        uid = self._authenticate()
        proxy = self._object_proxy()
        fields = ["id", "name", "currency_id", "country_id", "parent_id"]
        records = proxy.execute_kw(
            self._db, uid, self._password,
            "res.company", "search_read",
            [[("active", "=", True)]],
            {"fields": fields, "limit": 1000},
        )

        return [
            OdooCompany(
                id=r["id"],
                name=r["name"],
                currency=_extract_odoo_field(r, "currency_id"),  # type: ignore[arg-type]
                country_name=_extract_odoo_field(r, "country_id"),  # type: ignore[arg-type]
                parent_id=_extract_odoo_field(r, "parent_id"),  # type: ignore[arg-type]
            )
            for r in records
        ]
