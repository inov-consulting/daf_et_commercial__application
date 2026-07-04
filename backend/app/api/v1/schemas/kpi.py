"""Schémas Pydantic pour les KPIs — format AG Charts.

Chaque KPI retourne un objet directement utilisable comme `chartOptions`
dans AG Charts (React/Next.js) :
    { data: [...], series: [...] }
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# ── Blocs AG Charts ────────────────────────────────────────────────────────────

class AgSeries(BaseModel):
    """Définition d'une série AG Charts (type + clés)."""
    type: str = Field(description="Type de graphe : bar, line, pie, area, scatter…")
    xKey: str | None = Field(None, description="Clé X dans les objets data")
    yKey: str | None = Field(None, description="Clé Y dans les objets data")
    yName: str | None = Field(None, description="Label affiché dans la légende")
    angleKey: str | None = Field(None, description="Clé angle (pour pie/donut)")
    calloutLabelKey: str | None = Field(None, description="Clé label externe (pie)")
    extraFields: dict[str, Any] | None = Field(None, description="Champs supplémentaires AG Charts")


class KpiChartData(BaseModel):
    """Réponse format AGChart : data + series, prêt pour chartOptions."""
    data: list[dict[str, Any]] = Field(description="Tableau de points de données")
    series: list[AgSeries] = Field(description="Configuration des séries AG Charts")


# ── KPI complet ────────────────────────────────────────────────────────────────

class KpiOut(BaseModel):
    """Un indicateur avec ses métadonnées et ses données de graphe."""
    key: str = Field(description="Identifiant unique du KPI (ex: ca_mois)")
    label: str = Field(description="Libellé affiché (ex: Chiffre d'affaires du mois)")
    category: str = Field(description="Catégorie (ex: Finance, Transport, Activité)")
    description: str | None = None
    chart: KpiChartData = Field(description="Données prêtes pour AG Charts")
    unit: str | None = Field(None, description="Unité de la valeur principale (ex: XOF, %, dossiers)")
    period: str | None = Field(None, description="Période couverte (ex: 2025-06)")


# ── Catalogue ──────────────────────────────────────────────────────────────────

class KpiCatalogItem(BaseModel):
    """Entrée du catalogue : métadonnées sans données de graphe (usage config admin)."""
    key: str
    label: str
    category: str
    description: str | None = None
    unit: str | None = None


class KpiCatalogOut(BaseModel):
    """Réponse catalogue : tous les KPIs accessibles avec leurs données AG Charts incluses.

    Un seul appel suffit pour afficher la page KPI complète.
    """
    items: list[KpiOut]
    total: int
