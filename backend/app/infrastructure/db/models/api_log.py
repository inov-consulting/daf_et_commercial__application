"""Modèle pour logger les requêtes API (audit/tracing).

Stocke les détails de chaque requête HTTP entrante et sa réponse.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class ApiRequestLogOrm(BaseModel):
    """Log d'une requête API avec sa réponse.

    Permet le debugging, l'audit et l'analyse des appels API.
    """

    id: UUID = fields.UUIDField(pk=True, default=uuid4)

    # Informations de la requête
    method: str = fields.CharField(max_length=10)  # GET, POST, PUT, DELETE, PATCH
    path: str = fields.CharField(max_length=500)  # URL path (ex: /api/v1/prospects/123)
    query_params: dict | None = fields.JSONField(null=True)  # Query string params
    request_body: dict | str | None = fields.TextField(null=True)  # Body de la requête
    request_headers: dict | None = fields.JSONField(null=True)  # Headers (sans auth sensible)

    # Informations de l'utilisateur
    user_id: UUID | None = fields.UUIDField(null=True, index=True)
    user_email: str | None = fields.CharField(max_length=255, null=True)
    ip_address: str | None = fields.CharField(max_length=45, null=True)  # IPv4 ou IPv6
    user_agent: str | None = fields.TextField(null=True)

    # Informations de la réponse
    status_code: int | None = fields.IntField(null=True)
    response_body: dict | str | None = fields.TextField(null=True)
    response_size_bytes: int | None = fields.IntField(null=True)
    duration_ms: int | None = fields.IntField(null=True)  # Temps de traitement en ms

    # Métadonnées
    error_message: str | None = fields.TextField(null=True)
    is_error: bool = fields.BooleanField(default=False)
    tags: list[str] | None = fields.JSONField(null=True)  # Pour catégoriser (ex: ["prospect", "create"])

    class Meta:
        table = "api_request_logs"
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        return f"<ApiLog {self.method} {self.path} {self.status_code}>"
