"""Schémas Pydantic pour les offres transport IA."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ── Requêtes ──────────────────────────────────────────────────────────────────

class OfferChatIn(BaseModel):
    message: str = Field(description="Message de l'utilisateur dans la conversation")
    session_id: UUID | None = Field(None, description="ID de session existante (null pour démarrer)")
    offer_id: UUID | None = Field(None, description="ID de l'offre en cours (null pour démarrer)")


class OfferConfirmIn(BaseModel):
    pass


# ── Réponses ──────────────────────────────────────────────────────────────────

class OfferChatOut(BaseModel):
    offer_id: UUID = Field(description="ID de l'offre Portalis")
    session_id: UUID = Field(description="ID de session LangGraph à conserver")
    response: str = Field(description="Réponse de l'agent IA")
    status: str = Field(description="Statut de l'offre : draft | generated | confirmed | cancelled")


class PricingLine(BaseModel):
    label: str
    value: float | str
    unit: str


class OfferRoute(BaseModel):
    origin: str | None
    destination: str | None
    transport_mode: str | None
    vehicle_type: str | None
    planned_date: str | None


class OfferClient(BaseModel):
    name: str | None
    odoo_partner_id: int | None


class OfferDocumentSection(BaseModel):
    heading: str
    content: str


class OfferDocumentOut(BaseModel):
    offer_id: UUID
    status: str
    title: str | None = None
    reference: str | None = None
    date: str | None = None
    validity_days: int | None = None
    sections: list[OfferDocumentSection] = []
    pricing: list[PricingLine] = []
    route: OfferRoute | None = None
    client: OfferClient | None = None
    footer: str | None = None
    document_generated_at: datetime | None = None
    parse_error: bool = False
    warnings: list[str] = Field(
        default_factory=list,
        description="Avertissements non bloquants (ex: email de notification non envoyé)",
    )


class OfferConfirmOut(BaseModel):
    offer_id: UUID
    status: str = "confirmed"
    odoo_shipment_id: int
    odoo_shipment_name: str
    confirmed_at: datetime


class OfferSummaryOut(BaseModel):
    id: UUID
    session_id: UUID
    status: str
    title: str | None = None
    reference: str | None = None
    date: str | None = None
    validity_days: int | None = None
    odoo_shipment_id: int | None
    odoo_shipment_name: str | None
    created_at: datetime | None
    confirmed_at: datetime | None
