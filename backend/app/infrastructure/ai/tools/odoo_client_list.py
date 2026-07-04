"""Outil MCP pour lister les clients depuis Odoo via res.partner."""

from typing import Any


async def list_odoo_clients(search: str = "") -> list[dict[str, Any]]:
    """Liste les clients (partenaires) depuis Odoo ERP.

    Cet outil permet à l'agent IA de rechercher et lister les clients existants
    dans Odoo pour aider l'utilisateur à sélectionner le bon client lors de la
    création d'une offre de transport.

    Args:
        search: Terme de recherche optionnel pour filtrer par nom de client.
                Si vide, retourne tous les clients actifs.

    Returns:
        Liste des clients avec leurs informations principales (id, name, email, phone).
    """
    from app.infrastructure.odoo.client import OdooClient
    import asyncio

    try:
        client = OdooClient()
        
        # Domain : is_company=True pour les entreprises, active=True pour les actifs
        domain = [["is_company", "=", True], ["active", "=", True]]
        
        if search:
            domain.append(["name", "ilike", search])
        
        # Champs à récupérer
        fields = ["id", "name", "email", "phone", "street", "city", "country_id"]
        
        partners = await asyncio.to_thread(
            client.execute,
            "res.partner",
            "search_read",
            [domain],
            {"fields": fields, "limit": 50, "order": "name asc"},
        )
        
        # Formater pour l'affichage
        formatted = []
        for p in partners:
            formatted.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "email": p.get("email"),
                "phone": p.get("phone"),
                "address": f"{p.get('street', '')}, {p.get('city', '')}".strip(", "),
            })
        
        return formatted
        
    except Exception as exc:
        # En cas d'erreur, retourner une liste vide avec message d'erreur
        return [{"error": f"Erreur lors de la récupération des clients Odoo: {str(exc)}"}]
