"""Modèle ORM pour les cycles d'exécution de l'agent commercial."""
from tortoise import fields

from app.infrastructure.db.base import BaseModel


class CommercialRunOrm(BaseModel):
    """Enregistre chaque cycle d'exécution de l'agent commercial."""

    trigger = fields.CharField(max_length=30)
    # "startup" | "scheduled_morning" | "scheduled_evening" | "manual"

    status = fields.CharField(max_length=20, default="running")
    # "running" | "completed" | "error"

    started_at = fields.DatetimeField()
    completed_at = fields.DatetimeField(null=True)

    run_id = fields.CharField(max_length=36, null=True)
    # UUID LangGraph du run (null si erreur ou en cours)

    enriched = fields.IntField(default=0)
    # Nombre de clients enrichis avec succès dans Odoo

    enrichment_errors = fields.IntField(default=0)
    # Nombre d'erreurs lors de la sauvegarde du HTML dans Odoo

    predictions = fields.IntField(default=0)
    # Nombre de prédictions commerciales créées en base

    prediction_errors = fields.IntField(default=0)
    # Nombre d'erreurs lors de la sauvegarde des prédictions

    class Meta:
        table = "commercial_runs"
        ordering = ["-started_at"]
