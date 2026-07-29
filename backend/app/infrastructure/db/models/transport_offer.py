"""ORM model : offres transport générées par IA."""

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class TransportOfferOrm(BaseModel):
    """Offre commerciale transport générée par conversation IA.

    Cycle de vie :
      draft      → en cours de collecte (conversation active)
      completed  → collecte terminée par l'IA, en attente de génération du document
      generated  → document Markdown généré par Claude, en attente de validation
      confirmed  → validée par l'utilisateur, dossier Odoo créé
      cancelled  → abandonnée
    """

    company_id = fields.UUIDField(null=True, index=True)
    """UUID local de la Company Portalis (table companies)."""

    session_id = fields.UUIDField(index=True)
    """ID de session LangGraph associée à la conversation."""

    user_id = fields.UUIDField(null=True, index=True)
    """Utilisateur Portalis qui a initié l'offre."""

    status = fields.CharField(max_length=16, default="draft")
    """draft | completed | generated | confirmed | cancelled"""

    # ── Données collectées pendant la conversation ─────────────────────────────
    collected_data: dict = fields.JSONField(default=dict)
    """Dictionnaire des informations collectées : client, trajet, produit, etc."""

    # ── Document généré par Claude ─────────────────────────────────────────────
    document_markdown = fields.TextField(null=True)
    """Contenu Markdown de l'offre généré par Claude."""

    document_generated_at = fields.DatetimeField(null=True)
    """Horodatage de génération du document."""

    # ── Lien vers Odoo après confirmation ─────────────────────────────────────
    odoo_shipment_id = fields.IntField(null=True)
    """ID du dossier transport.shipment créé dans Odoo."""

    odoo_shipment_name = fields.CharField(max_length=64, null=True)
    """Référence du dossier Odoo (ex: SHIP/2026/0042)."""

    confirmed_at = fields.DatetimeField(null=True)
    """Horodatage de confirmation et création Odoo."""

    class Meta:
        table = "transport_offers"
