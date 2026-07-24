"""Schémas Pydantic pour l'agent commercial d'enrichissement."""
from __future__ import annotations

from pydantic import BaseModel, Field


class EnrichRequest(BaseModel):
    limit: int = Field(20, ge=1, le=200, description="Nombre maximum de clients à traiter")


class EnrichStatusOut(BaseModel):
    status: str = Field(description="'streaming' quand le run est en cours")
    message: str = Field(description="Message informatif")
