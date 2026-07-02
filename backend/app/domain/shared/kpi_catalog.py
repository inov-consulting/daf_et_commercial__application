"""Catalogue des indicateurs de performance (KPIs).

Chaque KPI est défini avec :
- une clé unique
- un label et une catégorie
- la permission requise pour y accéder
- la source de données (odoo | portalis | mixed)

Le matching rôle ↔ KPI est implicite via la matrice de permissions dans role.py.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class KpiDefinition:
    key: str
    label: str
    category: str
    source: str
    description: str | None = None
    unit: str | None = None


# ── Registre ──────────────────────────────────────────────────────────────────
# Ce catalogue est statique : il décrit les KPIs disponibles dans l'application.
# L'accès par groupe est configuré dynamiquement via la table kpi_group_access.

_CATALOG: list[KpiDefinition] = [
    KpiDefinition(
        key="ca_mois",
        label="Chiffre d'affaires du mois",
        category="Finance",
        source="odoo",
        description="CA mensuel agrégé par mois sur les dossiers transport confirmés.",
        unit="XOF",
    ),
    KpiDefinition(
        key="marge_globale",
        label="Marge globale (%)",
        category="Finance",
        source="odoo",
        description="Taux de marge moyen sur l'ensemble des dossiers (marge / CA).",
        unit="%",
    ),
    KpiDefinition(
        key="marge_dossier",
        label="Marge par dossier",
        category="Finance",
        source="odoo",
        description="Montant de marge par dossier transport sur la période.",
        unit="XOF",
    ),
    KpiDefinition(
        key="ponctualite",
        label="Taux de livraison à temps (ponctualité)",
        category="Transport",
        source="odoo",
        description="Pourcentage de voyages livrés avant ou à la date prévue.",
        unit="%",
    ),
    KpiDefinition(
        key="dossiers_par_statut",
        label="Nombre de dossiers par statut",
        category="Transport",
        source="odoo",
        description="Répartition des dossiers transport selon leur statut Odoo.",
        unit="dossiers",
    ),
    KpiDefinition(
        key="stats_dossiers",
        label="Statistiques globales des dossiers",
        category="Transport",
        source="odoo",
        description="Compteurs : total, confirmés, en cours, terminés, annulés, facturés, non facturés.",
        unit="dossiers",
    ),
]

_CATALOG_BY_KEY: dict[str, KpiDefinition] = {k.key: k for k in _CATALOG}


def get_all() -> list[KpiDefinition]:
    return list(_CATALOG)


def get_by_key(key: str) -> KpiDefinition | None:
    return _CATALOG_BY_KEY.get(key)


def get_all_keys() -> set[str]:
    return set(_CATALOG_BY_KEY.keys())


def filter_by_keys(keys: set[str]) -> list[KpiDefinition]:
    """Retourne les KpiDefinition dont la clé est dans `keys`."""
    return [k for k in _CATALOG if k.key in keys]
