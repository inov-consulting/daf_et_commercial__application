"""Value objects partagés.

Pas d'I/O, pas de framework. Représentent des concepts métier immuables
utilisables partout (devises, pays, montants, etc.).
"""

from enum import StrEnum


class Country(StrEnum):
    """Pays supportés par la plateforme (ISO 3166-1 alpha-2)."""

    SN = "SN"  # Sénégal
    CI = "CI"  # Côte d'Ivoire
    MA = "MA"  # Maroc
    CM = "CM"  # Cameroun (siège INOV)
    FR = "FR"  # France (potentiel commissionnaire)


class Currency(StrEnum):
    """Devises supportées (ISO 4217)."""

    XOF = "XOF"  # Franc CFA UEMOA (Sénégal, CI)
    XAF = "XAF"  # Franc CFA CEMAC (Cameroun)
    MAD = "MAD"  # Dirham marocain
    EUR = "EUR"
    USD = "USD"
