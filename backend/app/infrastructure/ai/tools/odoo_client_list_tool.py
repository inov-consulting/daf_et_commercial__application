"""Wrapper LangChain pour l'outil de liste de clients Odoo."""

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field


class ListOdooClientsInput(BaseModel):
    """Schéma d'entrée pour l'outil de liste de clients Odoo."""

    search: str = Field(
        default="",
        description="Terme de recherche optionnel pour filtrer par nom de client. Si vide, retourne tous les clients actifs.",
    )


def make_list_odoo_clients_tool(erp_id: int | None = None) -> StructuredTool:
    """Crée l'outil list_odoo_clients avec l'erp_id injecté par closure."""

    async def _impl(search: str = "") -> str:
        from app.infrastructure.ai.tools.odoo_client_list import list_odoo_clients, _SEARCH_LIMIT

        if not search or not search.strip():
            return (
                "Merci de fournir un mot-clé de recherche (au moins 2 caractères) "
                "pour trouver le client. Par exemple : 'Total', 'Sen', 'Dakar'."
            )

        clients = await list_odoo_clients(search=search.strip(), erp_id=erp_id)

        if not clients:
            return f"Aucun client trouvé pour « {search} ». Essayez un autre mot-clé ou vérifiez l'orthographe."

        if clients and "error" in clients[0]:
            return clients[0]["error"]

        result = f"Clients trouvés pour « {search} » ({len(clients)} résultat(s)) :\n\n"
        for c in clients:
            result += f"- **{c['name']}** (ID: {c['id']})"
            if c.get("email"):
                result += f" — {c['email']}"
            if c.get("phone"):
                result += f" — {c['phone']}"
            if c.get("address"):
                result += f"\n  {c['address']}"
            result += "\n"

        if len(clients) == _SEARCH_LIMIT:
            result += f"\n_(Résultats limités à {_SEARCH_LIMIT}. Affinez la recherche si le client n'apparaît pas.)_"

        return result

    return StructuredTool.from_function(
        coroutine=_impl,
        name="list_odoo_clients",
        description=(
            "Recherche des clients (partenaires) dans Odoo ERP par mot-clé. "
            "Le paramètre 'search' est OBLIGATOIRE — il doit contenir au moins 2 caractères. "
            "Retourne au maximum 20 résultats. "
            "Si l'utilisateur ne connaît pas le nom exact, demande-lui quelques lettres du nom du client "
            "avant d'appeler cet outil."
        ),
        args_schema=ListOdooClientsInput,
    )


# Instance sans filtre company (usage générique sans contexte multi-société)
list_odoo_clients_tool = make_list_odoo_clients_tool(erp_id=None)
