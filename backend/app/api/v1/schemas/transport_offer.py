"""Schémas Pydantic pour les offres transport IA."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# ── Enums ─────────────────────────────────────────────────────────────────────

class TransportMode(str, Enum):
    TERRESTRE = "terrestre"
    MARITIME = "maritime"
    AERIEN = "aérien"
    MULTIMODAL = "multimodal"


class VehicleType(str, Enum):
    PLATEAU = "plateau"
    CITERNE = "citerne"
    BENNE = "benne"


# ── Requêtes ──────────────────────────────────────────────────────────────────

class OfferChatIn(BaseModel):
    message: str = Field(description="Message de l'utilisateur dans la conversation")
    session_id: UUID | None = Field(None, description="ID de session existante (null pour démarrer)")
    offer_id: UUID | None = Field(None, description="ID de l'offre en cours (null pour démarrer)")


class OfferFormIn(BaseModel):
    """Données du formulaire manuel pour créer ou modifier une offre.

    Correspond aux champs collectés par l'IA (collected_data).
    Tous les champs sont optionnels pour permettre les mises à jour partielles (PATCH).
    Règle : vehicle_type est obligatoire quand transport_mode = terrestre.
    """

    client_name: str | None = Field(None, description="Nom de l'entreprise cliente")
    odoo_partner_id: int | None = Field(None, description="ID Odoo du partenaire (res.partner)")
    product_description: str | None = Field(None, description="Nature et description du produit transporté")
    quantity: float | None = Field(None, gt=0, description="Volume ou poids")
    quantity_unit: str | None = Field(None, description="Unité : litres, tonnes, m³…")
    origin: str | None = Field(None, description="Lieu de chargement")
    destination: str | None = Field(None, description="Lieu de livraison")
    transport_mode: TransportMode | None = Field(None, description="Mode de transport")
    vehicle_type: VehicleType | None = Field(
        None, description="Type de véhicule (obligatoire si transport_mode=terrestre)"
    )
    planned_date: str | None = Field(None, description="Date de départ prévue (YYYY-MM-DD)")
    price_unit: float | None = Field(None, gt=0, description="Tarif par unité de mesure")
    validity_days: int | None = Field(None, gt=0, description="Durée de validité en jours")
    payment_conditions: str | None = Field(None, description="Conditions de paiement")
    remarks: str | None = Field(None, description="Remarques ou conditions particulières")

    @model_validator(mode="after")
    def vehicle_required_for_terrestre(self) -> "OfferFormIn":
        if self.transport_mode == TransportMode.TERRESTRE and not self.vehicle_type:
            raise ValueError("Type de vehicule est obligatoire quand si mode de transport  est 'Terrestre'")
        return self

    def to_collected_data(self) -> dict:
        """Convertit le formulaire au format collected_data attendu par l'IA et le document."""
        data = {}
        for field_name in (
            "client_name", "odoo_partner_id", "product_description",
            "quantity", "quantity_unit", "origin", "destination",
            "transport_mode", "vehicle_type", "planned_date",
            "price_unit", "validity_days", "payment_conditions", "remarks",
        ):
            val = getattr(self, field_name)
            if val is not None:
                data[field_name] = val.value if isinstance(val, Enum) else val
        return data


class OfferConfirmIn(BaseModel):
    pass


# ── Réponses ──────────────────────────────────────────────────────────────────

class OfferChatOut(BaseModel):
    offer_id: UUID = Field(description="ID de l'offre Portalis")
    session_id: UUID = Field(description="ID de session LangGraph à conserver")
    response: str = Field(description="Réponse de l'agent IA")
    status: str = Field(description="Statut de l'offre : draft | completed | generated | confirmed | cancelled")


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
    route: OfferRoute | None = None
    amount_ttc: float | None = None
    odoo_shipment_id: int | None
    odoo_shipment_name: str | None
    created_at: datetime | None
    confirmed_at: datetime | None


class OdooClientOut(BaseModel):
    """Client Odoo (res.partner) retourné pour la liste déroulante du formulaire."""

    id: int
    name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None
