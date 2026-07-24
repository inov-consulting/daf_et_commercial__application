"""Schémas Pydantic pour les prédictions commerciales."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PredictionOut(BaseModel):
    id: UUID
    partner_id: int
    partner_name: str
    prediction_summary: str
    suggested_action: str
    opportunity_type: str
    confidence_score: float
    predicted_revenue: float | None
    data_sources: dict
    status: str
    validated_by: UUID | None
    validated_at: datetime | None
    rejected_by: UUID | None
    rejected_at: datetime | None
    rejection_reason: str | None
    prospect_id: UUID | None
    odoo_lead_id: int | None
    created_at: datetime | None
    updated_at: datetime | None


class ValidateIn(BaseModel):
    expected_revenue: float | None = Field(
        None,
        description="Peut remplacer le CA estimé par l'IA",
    )
    notes: str | None = Field(None, description="Note du commercial")


class RejectIn(BaseModel):
    reason: str | None = Field(None, description="Motif du rejet")


class ValidationOut(BaseModel):
    prediction_id: UUID
    status: str
    prospect_id: UUID
    odoo_lead_id: int
    message: str
