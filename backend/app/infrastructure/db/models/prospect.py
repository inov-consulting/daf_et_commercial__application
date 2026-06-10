"""Modèle Tortoise ORM pour les Prospects (table Portalis locale)."""

from datetime import datetime
from uuid import UUID

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class ProspectOrm(BaseModel):
    """Table principale des prospects Portalis.

    Stocke les champs métier spécifiques non présents dans Odoo.
    Fait référence à crm.lead via odoo_lead_id.
    """

    # Lien vers Odoo crm.lead
    odoo_lead_id: int = fields.IntField(unique=True, index=True)

    # Champs métier Portalis (non dans Odoo)
    status: str = fields.CharField(max_length=20, default="nouveau")
    portalis_sector: str | None = fields.CharField(max_length=100, null=True)
    portalis_notes: str | None = fields.TextField(null=True)

    # Tracking pipeline
    status_changed_at: datetime | None = fields.DatetimeField(null=True)
    created_by: UUID | None = fields.UUIDField(null=True)

    # Métadonnées
    last_sync_at: datetime | None = fields.DatetimeField(null=True)

    class Meta:
        table = "prospects"

    def __repr__(self) -> str:
        return f"<Prospect {self.id} odoo_lead={self.odoo_lead_id} status={self.status}>"


class ProspectActivityOrm(BaseModel):
    """Timeline des activités/événements sur un prospect.

    Remplace crm.activity.report pour l'historique Portalis interne.
    """

    prospect: fields.ForeignKeyRelation["ProspectOrm"] = fields.ForeignKeyField(
        "models.ProspectOrm",
        related_name="activities",
        on_delete=fields.CASCADE,
    )
    activity_type: str = fields.CharField(max_length=50)  # 'status_change', 'note', 'call', 'email'
    description: str | None = fields.TextField(null=True)
    performed_by: UUID | None = fields.UUIDField(null=True)

    class Meta:
        table = "prospect_activities"

    def __repr__(self) -> str:
        return f"<ProspectActivity {self.activity_type} prospect={self.prospect_id}>"
