"""ORM model pour les notifications utilisateurs.

Chaque événement métier (CR prêt, offre créée, message WhatsApp, etc.)
génère une entrée ici, permettant :
- l'affichage du badge de notifications non lues
- l'historique consultable par l'utilisateur
- le push FCM et le broadcast WebSocket
"""
from __future__ import annotations

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class NotificationOrm(BaseModel):
    company_id = fields.UUIDField(null=True, index=True)
    user_id = fields.UUIDField(index=True)

    # Type sémantique de la notification
    # cr_ready | cr_failed | cr_to_validate | offer_to_validate |
    # daf_cycle_done | whatsapp_message | relance_sent | daf_started | daf_stopped
    notification_type = fields.CharField(max_length=64, index=True)

    title = fields.CharField(max_length=255)
    body = fields.TextField(default="")

    # Statut lu/non-lu
    status = fields.CharField(max_length=16, default="unread", index=True)  # "unread" | "read"
    read_at = fields.DatetimeField(null=True, default=None)

    # Lien vers l'objet métier concerné (optionnel)
    reference_type = fields.CharField(max_length=64, null=True, default=None)  # "compte_rendu" | "transport_offer" | "whatsapp" | "daf_run"
    reference_id = fields.UUIDField(null=True, default=None)

    # Données supplémentaires (URL d'action, métadonnées)
    data = fields.JSONField(null=True, default=None)

    class Meta:
        table = "notifications"
        ordering = ["-created_at"]
