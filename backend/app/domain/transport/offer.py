"""Entité domaine : offre transport."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from uuid import UUID

OfferStatus = Literal["draft", "generated", "validated", "confirmed", "cancelled"]


@dataclass(slots=True, kw_only=True)
class TransportOffer:
    id: UUID
    session_id: UUID
    user_id: UUID | None
    status: OfferStatus
    collected_data: dict = field(default_factory=dict)
    document_markdown: str | None = None
    document_generated_at: datetime | None = None
    odoo_shipment_id: int | None = None
    odoo_shipment_name: str | None = None
    confirmed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
