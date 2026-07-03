"""Outil pour marquer une offre comme terminée (completed)."""

from typing import Any
from uuid import UUID


async def mark_offer_completed(session_id: UUID) -> str:
    """Marque une offre de transport comme terminée (statut completed).

    Cet outil doit être appelé par l'IA quand elle a collecté toutes les informations
    nécessaires pour l'offre et présenté le récapitulatif à l'utilisateur.

    Args:
        session_id: ID de session LangGraph associée à l'offre.

    Returns:
        Message de confirmation.
    """
    from app.infrastructure.db.repositories.transport_offer import TransportOfferRepository

    try:
        repo = TransportOfferRepository()
        # Trouver l'offre par session_id
        from app.infrastructure.db.models.transport_offer import TransportOfferOrm
        offer_orm = await TransportOfferOrm.filter(session_id=session_id).first()
        
        if offer_orm is None:
            return f"Erreur : aucune offre trouvée pour la session {session_id}."
        
        offer_id = offer_orm.id
        
        if offer_orm.status in ("confirmed", "cancelled"):
            return f"Erreur : l'offre est déjà au statut '{offer_orm.status}', impossible de la marquer comme terminée."
        
        if offer_orm.status == "generated":
            return f"Info : l'offre est déjà générée (statut 'generated'), pas besoin de la marquer comme terminée."
        
        # Mettre à jour le statut
        await repo.update_status(offer_id, "completed")
        
        return f"✅ Offre marquée comme terminée. L'utilisateur peut maintenant générer le document de l'offre."
        
    except Exception as exc:
        return f"Erreur lors de la mise à jour du statut : {str(exc)}"
