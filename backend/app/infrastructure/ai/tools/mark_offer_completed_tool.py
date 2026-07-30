"""Wrapper LangChain pour l'outil de marquage d'offre terminée."""

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field


class MarkOfferCompletedInput(BaseModel):
    """Schéma d'entrée pour l'outil de marquage d'offre terminée."""
    
    session_id: str = Field(
        description="ID de session LangGraph (UUID) associée à l'offre.",
    )


async def _mark_offer_completed_impl(session_id: str) -> str:
    """Implémentation asynchrone du marquage d'offre terminée."""
    from uuid import UUID
    from app.infrastructure.ai.tools.mark_offer_completed import mark_offer_completed
    
    try:
        uuid_session_id = UUID(session_id)
        return await mark_offer_completed(uuid_session_id)
    except ValueError:
        return f"Erreur : l'ID '{session_id}' n'est pas un UUID valide."
    except Exception as exc:
        return f"Erreur : {str(exc)}"


# Créer l'outil LangChain
mark_offer_completed_tool = StructuredTool.from_function(
    coroutine=_mark_offer_completed_impl,
    name="mark_offer_completed",
    description="""
Marque une offre de transport comme terminée (statut 'completed').
Utilise cet outil quand tu as collecté TOUTES les informations nécessaires et présenté le récapitulatif à l'utilisateur.
Cela indique que la collecte est finie et que l'utilisateur peut générer le document.
Le session_id est automatiquement disponible dans le contexte de la conversation.
""",
    args_schema=MarkOfferCompletedInput,
)
