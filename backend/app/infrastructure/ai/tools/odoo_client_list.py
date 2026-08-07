"""Outil MCP pour lister les clients depuis Odoo via res.partner."""

from typing import Any

_SEARCH_LIMIT = 20


async def list_odoo_clients(
    search: str = "",
    limit: int | None = None,
    companies_only: bool = False,
    suppliers: bool = False,
    erp_id: int | None = None,
) -> list[dict[str, Any]]:
    """Recherche des partenaires (res.partner) actifs depuis Odoo ERP par mot-clé.

    Args:
        search: Terme de recherche (ilike). Obligatoire pour limiter les résultats.
        limit: Nombre maximum de résultats. Défaut : _SEARCH_LIMIT (20).
        companies_only: Si True, filtre uniquement les entreprises (is_company=True).
        suppliers: Si True, retourne les fournisseurs (supplier_rank > 0).
                   Si False (défaut), retourne les clients (customer_rank > 0).
        erp_id: Non utilisé pour le filtrage partenaire (les partenaires Odoo sont
                globaux par conception — le company_id sur res.partner ne reflète pas
                la relation client). Le filtrage par société s'applique au niveau
                des dossiers transport (transport.shipment).

    Returns:
        Liste de dicts enrichis (id, name, is_company, email, phone, address).
    """
    import asyncio
    from app.infrastructure.odoo.client import OdooClient

    client = OdooClient()
    effective_limit = limit if limit is not None else _SEARCH_LIMIT

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
        "email", "phone",
        "street", "street2", "city", "zip", "country_id",
    ]

    partners: list[dict] = await asyncio.to_thread(
        client.execute,
        "res.partner",
        "search_read",
        [domain],
        {"fields": fields, "limit": effective_limit, "order": "name asc"},
    )

    result = []
    for p in partners:
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
            "street": street or None,
            "street2": street2 or None,
            "city": city or None,
            "zip": zip_code or None,
            "country": country,
            "address": address,
        })

    return result
