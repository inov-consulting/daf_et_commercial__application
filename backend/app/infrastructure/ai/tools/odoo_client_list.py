"""Outil MCP pour lister les clients depuis Odoo via res.partner."""

from typing import Any


async def list_odoo_clients(search: str = "", limit: int | None = None) -> list[dict[str, Any]]:
    """Liste les clients (partenaires entreprises) actifs depuis Odoo ERP.

    Args:
        search: Terme de recherche pour filtrer par nom (ilike). Vide = tous.
        limit: Nombre maximum de résultats. Si None, retourne TOUS les clients
               (pagination automatique via fetch_all). Sinon, tronque à cette valeur.

    Returns:
        Liste de dicts {id, name, email, phone, address}.
        Retourne [] en cas d'erreur.
    """
    import asyncio
    import logging

    from app.infrastructure.odoo.client import OdooClient

    logger = logging.getLogger(__name__)

    try:
        client = OdooClient()

        domain: list = [("is_company", "=", True), ("active", "=", True)]
        if search:
            domain.append(("name", "ilike", search))

        fields = ["id", "name", "email", "phone", "street", "city"]

        if limit is None:
            partners = await asyncio.to_thread(client.fetch_all, "res.partner", domain, fields)
        else:
            partners = await asyncio.to_thread(
                client.execute,
                "res.partner",
                "search_read",
                [domain],
                {"fields": fields, "limit": limit, "order": "name asc"},
            )

        result = []
        for p in sorted(partners, key=lambda x: x.get("name", "").lower()):
            city = p.get("city") or ""
            street = p.get("street") or ""
            address = ", ".join(part for part in [street, city] if part) or None
            result.append({
                "id": p["id"],
                "name": p.get("name", ""),
                "email": p.get("email") or None,
                "phone": p.get("phone") or None,
                "address": address,
            })

        return result

    except Exception:
        logger.exception("odoo.list_clients.failed search=%s limit=%s", search, limit)
        return []
