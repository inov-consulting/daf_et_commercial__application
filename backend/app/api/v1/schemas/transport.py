"""Schémas Pydantic pour le module Transport (lecture Odoo)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


# ── Helpers ──────────────────────────────────────────────────────────────────

def _m2o_name(value: Any) -> str | None:
    if isinstance(value, list) and len(value) == 2:
        return str(value[1])
    return None


def _m2o_id(value: Any) -> int | None:
    if isinstance(value, list) and len(value) >= 1:
        return int(value[0])
    if isinstance(value, int):
        return value
    return None


# ── Sous-objets ───────────────────────────────────────────────────────────────

class M2ORef(BaseModel):
    id: int
    name: str


class ChargeOut(BaseModel):
    id: int
    name: str | None
    charge_type: str | None
    amount: float | None
    porteur: str | None
    state: str | None
    date: date | None

    @classmethod
    def from_odoo(cls, r: dict) -> "ChargeOut":
        return cls(
            id=r["id"],
            name=r.get("name") or None,
            charge_type=_m2o_name(r.get("charge_type_id")),
            amount=r.get("amount"),
            porteur=r.get("porteur"),
            state=r.get("state"),
            date=r.get("date") or None,
        )


class ImmobilizationOut(BaseModel):
    id: int
    name: str | None
    type: str | None
    start_date: date | None
    end_date: date | None
    duration_hours: float | None
    state: str | None

    @classmethod
    def from_odoo(cls, r: dict) -> "ImmobilizationOut":
        return cls(
            id=r["id"],
            name=r.get("name") or None,
            type=r.get("type"),
            start_date=r.get("start_date") or None,
            end_date=r.get("end_date") or None,
            duration_hours=r.get("duration_hours"),
            state=r.get("state"),
        )


class WorkflowStepOut(BaseModel):
    instance_id: int | None
    template: str | None
    current_step: str | None
    state: str | None


# ── Voyage ────────────────────────────────────────────────────────────────────

class VoyageListItem(BaseModel):
    id: int
    name: str | None
    shipment_id: int | None
    shipment_name: str | None
    transport_mode: str | None
    state: str | None
    mode_operatoire: str | None
    vehicle: str | None
    driver: str | None
    vehicle_subtype: str | None
    origin_location: str | None
    destination_location: str | None
    date_departure: date | None
    date_arrival_dest: date | None
    actual_qty_weighed: float | None
    distance_km: float | None
    fuel_allowance: float | None
    fuel_actual: float | None
    fuel_variance: float | None
    fuel_efficiency_pct: float | None
    total_charges: float | None
    revenue: float | None
    margin: float | None
    company: str | None
    currency: str | None

    @classmethod
    def from_odoo(cls, r: dict) -> "VoyageListItem":
        return cls(
            id=r["id"],
            name=r.get("name") or None,
            shipment_id=_m2o_id(r.get("shipment_id")),
            shipment_name=_m2o_name(r.get("shipment_id")),
            transport_mode=r.get("transport_mode"),
            state=r.get("state"),
            mode_operatoire=r.get("mode_operatoire"),
            vehicle=_m2o_name(r.get("vehicle_id")),
            driver=_m2o_name(r.get("driver_id")),
            vehicle_subtype=_m2o_name(r.get("vehicle_subtype_id")),
            origin_location=r.get("origin_location") or None,
            destination_location=r.get("destination_location") or None,
            date_departure=r.get("date_departure") or None,
            date_arrival_dest=r.get("date_arrival_dest") or None,
            actual_qty_weighed=r.get("actual_qty_weighed"),
            distance_km=r.get("distance_km"),
            fuel_allowance=r.get("fuel_allowance"),
            fuel_actual=r.get("fuel_actual"),
            fuel_variance=r.get("fuel_variance"),
            fuel_efficiency_pct=r.get("fuel_efficiency_pct"),
            total_charges=r.get("total_charges"),
            revenue=r.get("revenue"),
            margin=r.get("margin"),
            company=_m2o_name(r.get("company_id")),
            currency=_m2o_name(r.get("currency_id")),
        )


class VoyageDetail(VoyageListItem):
    charges: list[ChargeOut] = []
    immobilizations: list[ImmobilizationOut] = []


class VoyageListOut(BaseModel):
    items: list[VoyageListItem]
    total: int
    offset: int
    limit: int


# ── Shipment ──────────────────────────────────────────────────────────────────

class ShipmentListItem(BaseModel):
    id: int
    name: str | None
    partner: str | None
    partner_id: int | None
    transport_mode: str | None
    state: str | None
    date_start: date | None
    date_end: date | None
    origin_location: str | None
    destination_location: str | None
    vehicle_subtype: str | None
    distance_km: float | None
    sale_price_unit: float | None
    voyage_count: int | None
    total_charges: float | None
    revenue: float | None
    margin: float | None
    company: str | None
    currency: str | None

    @classmethod
    def from_odoo(cls, r: dict) -> "ShipmentListItem":
        return cls(
            id=r["id"],
            name=r.get("name") or None,
            partner=_m2o_name(r.get("partner_id")),
            partner_id=_m2o_id(r.get("partner_id")),
            transport_mode=r.get("transport_mode"),
            state=r.get("state"),
            date_start=r.get("date_start") or None,
            date_end=r.get("date_end") or None,
            origin_location=r.get("origin_location") or None,
            destination_location=r.get("destination_location") or None,
            vehicle_subtype=_m2o_name(r.get("vehicle_subtype_id")),
            distance_km=r.get("distance_km"),
            sale_price_unit=r.get("sale_price_unit"),
            voyage_count=r.get("voyage_count"),
            total_charges=r.get("total_charges"),
            revenue=r.get("revenue"),
            margin=r.get("margin"),
            company=_m2o_name(r.get("company_id")),
            currency=_m2o_name(r.get("currency_id")),
        )


class ShipmentDetail(ShipmentListItem):
    date_order: date | None = None
    product_description: str | None = None
    planned_qty: float | None = None
    voyages: list[VoyageListItem] = []
    charges: list[ChargeOut] = []
    immobilizations: list[ImmobilizationOut] = []
    workflow: WorkflowStepOut | None = None


class ShipmentListOut(BaseModel):
    items: list[ShipmentListItem]
    total: int
    offset: int
    limit: int


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardModeStats(BaseModel):
    transport_mode: str
    shipment_count: int
    voyage_count: int
    total_charges: float
    revenue: float
    margin: float


class DashboardOut(BaseModel):
    period_from: date | None
    period_to: date | None
    total_shipments: int
    total_voyages: int
    total_charges: float
    total_revenue: float
    total_margin: float
    by_mode: list[DashboardModeStats]
