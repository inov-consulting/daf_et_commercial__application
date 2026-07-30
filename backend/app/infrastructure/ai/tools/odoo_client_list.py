"""Outil MCP pour lister les clients depuis Odoo via res.partner."""

from typing import Any


async def list_odoo_clients(
    search: str = "",
    limit: int | None = None,
    companies_only: bool = False,
    suppliers: bool = False,
) -> list[dict[str, Any]]:
    """Liste les partenaires (res.partner) actifs depuis Odoo ERP.

    Args:
        search: Terme de recherche pour filtrer par nom (ilike). Vide = tous.
        limit: Nombre maximum de résultats. Si None, retourne TOUS (fetch_all).
        companies_only: Si True, filtre uniquement les entreprises (is_company=True).
        suppliers: Si True, retourne les fournisseurs (supplier_rank > 0).
                   Si False (défaut), retourne les clients (customer_rank > 0).

    Returns:
        Liste de dicts enrichis (id, name, is_company, email, phone, mobile,
        street, street2, city, zip, country, address).
        Retourne [] en cas d'erreur.
    """
    import asyncio
    import logging

    from app.infrastructure.odoo.client import OdooClient

    logger = logging.getLogger(__name__)

    try:
        client = OdooClient()

        domain: list = [("active", "=", True)]
        if suppliers:
            domain.append(("supplier_rank", ">", 0))
        else:
            domain.append(("customer_rank", ">", 0))
        if companies_only:
            domain.append(("is_company", "=", True))
        if search:
            domain.append(("name", "ilike", search))

        fields = [
            "id", "name", "is_company",
            "email", "phone", "mobile",
            "street", "street2", "city", "zip", "country_id",
        ]

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
            street = p.get("street") or ""
            street2 = p.get("street2") or ""
            city = p.get("city") or ""
            zip_code = p.get("zip") or ""
            country_raw = p.get("country_id")
            country = country_raw[1] if isinstance(country_raw, list) and len(country_raw) > 1 else None

            address_parts = [part for part in [street, street2, zip_code, city, country] if part]
            address = ", ".join(address_parts) or None

            result.append({
                "id": p["id"],
                "name": p.get("name", ""),
                "is_company": bool(p.get("is_company")),
                "email": p.get("email") or None,
                "phone": p.get("phone") or None,
                "mobile": p.get("mobile") or None,
                "street": street or None,
                "street2": street2 or None,
                "city": city or None,
                "zip": zip_code or None,
                "country": country,
                "address": address,
            })

        return result

    except Exception:
        logger.exception("odoo.list_clients.failed search=%s limit=%s", search, limit)
        return []
