"""Schémas Pydantic pour l'agent commercial d'enrichissement."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class EnrichRequest(BaseModel):
    limit: int = Field(20, ge=1, le=200, description="Nombre maximum de clients à traiter")


class RunInfo(BaseModel):
    trigger: str = Field(..., description="startup | scheduled_morning | scheduled_evening | manual")
    started_at: str = Field(..., description="Horodatage ISO 8601 UTC du début")
    completed_at: str | None = Field(None, description="Horodatage ISO 8601 UTC de fin (None si en cours)")
    status: str = Field(..., description="running | completed | error")
    run_id: str | None = Field(None, description="UUID du run LangGraph (None si en cours ou erreur)")
    enriched: int = Field(0, description="Nombre de clients enrichis avec succès dans Odoo")
    enrichment_errors: int = Field(0, description="Nombre d'erreurs lors de la sauvegarde du HTML dans Odoo")
    predictions: int = Field(0, description="Nombre de prédictions commerciales créées en base")
    prediction_errors: int = Field(0, description="Nombre d'erreurs lors de la sauvegarde des prédictions")


class AgentStatusOut(BaseModel):
    scheduler_running: bool = Field(..., description="True si le scheduler APScheduler est actif")
    schedule: str = Field(..., description="Heures des cycles automatiques (UTC)")
    limit_per_cycle: int = Field(..., description="Nombre max de clients par cycle automatique")
    next_run_morning: str | None = Field(None, description="Prochain cycle matin (ISO 8601 UTC)")
    next_run_evening: str | None = Field(None, description="Prochain cycle soir (ISO 8601 UTC)")
    current_run: RunInfo | None = Field(None, description="Cycle en cours (None si aucun)")
    last_run: RunInfo | None = Field(None, description="Dernier cycle terminé (None si aucun depuis le démarrage)")


class TriggerOut(BaseModel):
    message: str = Field(..., description="Confirmation de déclenchement")
    skipped: bool = Field(False, description="True si un cycle était déjà en cours")


class CommercialRunOut(BaseModel):
    id: UUID
    trigger: str = Field(..., description="startup | scheduled_morning | scheduled_evening | manual")
    status: str = Field(..., description="running | completed | error")
    started_at: datetime
    completed_at: datetime | None = None
    run_id: str | None = Field(None, description="UUID LangGraph du run")
    enriched: int = Field(0, description="Clients enrichis avec succès dans Odoo")
    enrichment_errors: int = Field(0, description="Erreurs d'enrichissement Odoo")
    predictions: int = Field(0, description="Prédictions créées en base")
    prediction_errors: int = Field(0, description="Erreurs de sauvegarde prédiction")
