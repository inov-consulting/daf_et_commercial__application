"""Mapper Odoo → Domain Company."""

from __future__ import annotations

from uuid import UUID

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


_COUNTRY_CURRENCY_FALLBACK: dict[Country, Currency] = {
    Country.SN: Currency.XOF,
    Country.CI: Currency.XOF,
    Country.CM: Currency.XAF,
    Country.MA: Currency.MAD,
    Country.FR: Currency.EUR,
}


def _normalize(text: str | None) -> str:
    return (text or "").strip().lower()


def _resolve_country(name: str | None) -> Country | None:
    """Résout un nom de pays Odoo en Country. Retourne None si inconnu."""
    if not name:
        return None
    country = _COUNTRY_NAME_MAP.get(_normalize(name))
    if country is not None:
        return country
    raw = name.strip().upper()
    if len(raw) == 2 and raw in {c.value for c in Country}:
        return Country(raw)
    return None


def _resolve_currency(currency_name: str | None, country: Country) -> Currency | None:
    """Résout un nom de devise Odoo en Currency, avec fallback par pays."""
    currency = _CURRENCY_NAME_MAP.get(_normalize(currency_name))
    if currency is not None:
        return currency
    raw = (currency_name or "").strip().upper()
    if raw in {c.value for c in Currency}:
        return Currency(raw)
    return _COUNTRY_CURRENCY_FALLBACK.get(country)


def map_odoo_company_to_domain(odoo: OdooCompany) -> Company | None:
    """Convertit une entreprise Odoo en entité domaine.

    Retourne ``None`` si le pays ou la devise ne peut pas être mappé.
    """
    country = _resolve_country(odoo.country_name)
    if country is None:
        return None

    currency = _resolve_currency(odoo.currency, country)
    if currency is None:
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
