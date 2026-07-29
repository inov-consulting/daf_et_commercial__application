"""ORM model : prédictions commerciales générées par l'agent IA.

Une prédiction par client analysé. Statut : pending → validated | rejected.
La validation crée automatiquement un prospect dans Portalis + un lead dans Odoo.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class CommercialPredictionOrm(BaseModel):
    """Prédiction commerciale IA en attente de validation humaine."""

    # Entreprise Portalis
    company_id = fields.UUIDField(null=True, index=True)

    # Référence client Odoo
    partner_id: int = fields.IntField(index=True, description="ID res.partner Odoo")
    partner_name: str = fields.CharField(max_length=255)

    # Contenu de la prédiction
    prediction_summary: str = fields.TextField(description="Analyse complète en Markdown")
    suggested_action: str = fields.TextField(description="Action commerciale recommandée")
    opportunity_type: str = fields.CharField(
        max_length=50,
        default="opportunite",
        description="renouvellement | upsell | nouveau_besoin | opportunite",
    )
    confidence_score: float = fields.FloatField(
        default=0.0, description="Score de confiance 0.0 → 1.0"
    )
    predicted_revenue: float | None = fields.FloatField(
        null=True, description="CA estimé en devise locale"
    )

    # Sources de données utilisées par l'agent
    data_sources: dict = fields.JSONField(
        default=dict,
        description="Quelles données ont été utilisées (web, transport_history, shipments)",
    )

    # Cycle de vie
    status: str = fields.CharField(
        max_length=20,
        default="pending",
        description="pending | validated | rejected",
    )
    validated_by: UUID | None = fields.UUIDField(null=True)
    validated_at: datetime | None = fields.DatetimeField(null=True)
    rejected_by: UUID | None = fields.UUIDField(null=True)
    rejected_at: datetime | None = fields.DatetimeField(null=True)
    rejection_reason: str | None = fields.TextField(null=True)

    # Liens créés lors de la validation
    prospect_id: UUID | None = fields.UUIDField(
        null=True, description="UUID ProspectOrm créé après validation"
    )
    odoo_lead_id: int | None = fields.IntField(
        null=True, description="ID crm.lead Odoo créé après validation"
    )

    class Meta:
        table = "commercial_predictions"
