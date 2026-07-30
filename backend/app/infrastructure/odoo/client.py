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

    def execute(self, model: str, method: str, args: list, kwargs: dict | None = None) -> object:
        """Exécute un appel XML-RPC Odoo de manière synchrone.

        À utiliser dans asyncio.to_thread() pour les appels async.
        Exemple: await asyncio.to_thread(oc.execute, "crm.lead", "search_read", [...], {...})
        """
        uid = self._authenticate()
        pwd = self._api_key or self._password
        return self._object_proxy().execute_kw(
            self._db, uid, pwd, model, method, args, kwargs or {},
        )

    def fetch_all(self, model: str, domain: list, fields: list, page_size: int = 1000) -> list[dict]:
        """Récupère tous les enregistrements en paginant automatiquement.

        À utiliser dans asyncio.to_thread() pour les appels async.
        Évite la troncature silencieuse des appels avec limit fixe.
        """
        records: list[dict] = []
        offset = 0
        while True:
            batch: list[dict] = self.execute(  # type: ignore[assignment]
                model,
                "search_read",
                [domain],
                {"fields": fields, "limit": page_size, "offset": offset},
            )
            if not batch:
                break
            records.extend(batch)
            if len(batch) < page_size:
                break
            offset += page_size
        return records

    def create_company(
        self,
        name: str,
        country_code: str,
        email: str | None = None,
        phone: str | None = None,
        website: str | None = None,
        address: str | None = None,
    ) -> int:
        """Crée une entreprise dans Odoo et retourne son ID.

        Recherche d'abord le country_id Odoo à partir du code ISO 2 lettres,
        puis crée un enregistrement res.company.
        """
        uid = self._authenticate()
        proxy = self._object_proxy()
        pwd = self._api_key or self._password

        # Résolution du pays Odoo depuis le code ISO
        country_ids: list[int] = proxy.execute_kw(
            self._db, uid, pwd,
            "res.country", "search",
            [[["code", "=", country_code.upper()]]],
        )
        vals: dict = {"name": name}
        if country_ids:
            vals["country_id"] = country_ids[0]
        if email:
            vals["email"] = email
        if phone:
            vals["phone"] = phone
        if website:
            vals["website"] = website
        if address:
            vals["street"] = address

        new_id: int = proxy.execute_kw(
            self._db, uid, pwd,
            "res.company", "create",
            [vals],
        )
        return new_id

    def update_company(
        self,
        erp_id: int,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        website: str | None = None,
        address: str | None = None,
    ) -> None:
        """Met à jour une entreprise existante dans Odoo."""
        uid = self._authenticate()
        proxy = self._object_proxy()
        pwd = self._api_key or self._password

        vals: dict = {}
        if name is not None:
            vals["name"] = name
        if email is not None:
            vals["email"] = email
        if phone is not None:
            vals["phone"] = phone
        if website is not None:
            vals["website"] = website
        if address is not None:
            vals["street"] = address

        if not vals:
            return

        proxy.execute_kw(
            self._db, uid, pwd,
            "res.company", "write",
            [[erp_id], vals],
        )

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
