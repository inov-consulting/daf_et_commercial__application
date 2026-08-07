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
        from app.infrastructure.ai.tools.odoo_client_list import list_odoo_clients

        clients = await list_odoo_clients(search=search, erp_id=erp_id)

        if not clients:
            return "Aucun client trouvé dans Odoo."

        if clients and "error" in clients[0]:
            return clients[0]["error"]

        result = "Voici les clients trouvés dans Odoo :\n\n"
        for client in clients:
            result += f"- **{client['name']}** (ID: {client['id']})"
            if client.get("email"):
                result += f" - {client['email']}"
            if client.get("phone"):
                result += f" - {client['phone']}"
            if client.get("address"):
                result += f"\n  Adresse: {client['address']}"
            result += "\n"

        return result

    return StructuredTool.from_function(
        coroutine=_impl,
        name="list_odoo_clients",
        description=(
            "Liste les clients (partenaires) depuis Odoo ERP, filtrés par la société active. "
            "Utilise cet outil quand l'utilisateur demande la liste des clients ou ne connaît pas le nom exact. "
            "Tu peux filtrer par nom avec le paramètre 'search'."
        ),
        args_schema=ListOdooClientsInput,
    )


# Instance sans filtre company (usage générique sans contexte multi-société)
list_odoo_clients_tool = make_list_odoo_clients_tool(erp_id=None)
