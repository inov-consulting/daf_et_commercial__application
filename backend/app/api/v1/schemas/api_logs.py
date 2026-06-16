"""Schémas pour les logs API (audit/tracing)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ApiLogOut(BaseModel):
    """Log API retourné par l'API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    method: str
    path: str
    query_params: dict | None
    status_code: int | None
    duration_ms: int | None
    user_id: UUID | None
    user_email: str | None
    ip_address: str | None
    is_error: bool
    error_message: str | None
    created_at: datetime


class ApiLogListOut(BaseModel):
    """Liste paginée de logs API."""

    items: list[ApiLogOut]
    total: int
    offset: int
    limit: int
