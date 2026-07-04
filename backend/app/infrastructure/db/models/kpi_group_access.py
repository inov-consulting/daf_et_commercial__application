"""ORM model : accès aux KPIs par groupe Keycloak.

Un enregistrement par groupe = liste des clés KPI auxquelles ce groupe a accès.
group_id correspond à l'ID du groupe dans Keycloak.
"""
from __future__ import annotations

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class KpiGroupAccessOrm(BaseModel):
    """Mapping groupe Keycloak ↔ liste de clés KPI autorisées."""

    group_id = fields.CharField(max_length=100, unique=True, description="ID du groupe Keycloak")
    group_name = fields.CharField(max_length=255, default="", description="Nom lisible du groupe (dénormalisé)")
    kpi_keys = fields.JSONField(default=list, description="Liste des clés KPI accessibles")

    class Meta:
        table = "kpi_group_access"
