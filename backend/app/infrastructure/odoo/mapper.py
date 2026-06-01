"""Mapper Odoo → Domain Company."""

from __future__ import annotations

from uuid import UUID, uuid5

from app.domain.shared.company import Company
from app.domain.shared.value_objects import Country, Currency
from app.infrastructure.odoo.client import OdooCompany

# Namespace fixe pour UUID stables
ODOO_UUID_NS = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

# Mapping nom de pays (Odoo) → code ISO 3166-1 alpha-2
_COUNTRY_NAME_MAP: dict[str, Country] = {
    "senegal": Country.SN,
    "sénégal": Country.SN,
    "cote d'ivoire": Country.CI,
    "côte d'ivoire": Country.CI,
    "ivory coast": Country.CI,
    "maroc": Country.MA,
    "morocco": Country.MA,
    "cameroun": Country.CM,
    "cameroon": Country.CM,
    "france": Country.FR,
}

# Mapping nom de devise (Odoo) → code ISO 4217
_CURRENCY_NAME_MAP: dict[str, Currency] = {
    "xof": Currency.XOF,
    "cfa franc bceao": Currency.XOF,
    "franc cfa bceao": Currency.XOF,
    "xaf": Currency.XAF,
    "cfa franc beac": Currency.XAF,
    "franc cfa beac": Currency.XAF,
    "mad": Currency.MAD,
    "moroccan dirham": Currency.MAD,
    "dirham marocain": Currency.MAD,
    "eur": Currency.EUR,
    "euro": Currency.EUR,
    "usd": Currency.USD,
    "us dollar": Currency.USD,
    "dollar us": Currency.USD,
}


def _normalize(text: str | None) -> str:
    return (text or "").strip().lower()


def map_odoo_company_to_domain(odoo: OdooCompany) -> Company | None:
    """Convertit une entreprise Odoo en entité domaine.

    Retourne ``None`` si le pays ou la devise ne peut pas être mappé.
    """
    if not odoo.country_name:
        return None

    country = _COUNTRY_NAME_MAP.get(_normalize(odoo.country_name))
    if country is None:
        # fallback : si le code ressemble déjà à un code ISO 2 lettres
        raw = (odoo.country_name or "").strip().upper()
        if len(raw) == 2 and raw in {c.value for c in Country}:
            country = Country(raw)
        else:
            return None

    currency = _CURRENCY_NAME_MAP.get(_normalize(odoo.currency))
    if currency is None:
        raw = (odoo.currency or "").strip().upper()
        if raw in {c.value for c in Currency}:
            currency = Currency(raw)
        else:
            # fallback XOF pour la zone UEMOA
            if country in (Country.SN, Country.CI):
                currency = Currency.XOF
            elif country == Country.CM:
                currency = Currency.XAF
            elif country == Country.MA:
                currency = Currency.MAD
            elif country == Country.FR:
                currency = Currency.EUR
            else:
                return None

    return Company(
        id=odoo.uuid,
        name=odoo.name,
        country=country,
        country_name=odoo.country_name or "",
        default_currency=currency,
        erp_id=odoo.id,
        parent_company_id=None,
    )
