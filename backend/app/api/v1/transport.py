"""Router API Transport — lecture seule des données Odoo 19.

Connexion via XML-RPC en utilisant OdooClient.execute().
Toutes les requêtes Odoo sont exécutées dans asyncio.to_thread pour ne pas bloquer.
"""
from __future__ import annotations

import asyncio
from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require_permission
from app.api.v1.schemas.transport import (
    ChargeOut,
    DashboardModeStats,
    DashboardOut,
    ImmobilizationOut,
    ShipmentDetail,
    ShipmentListItem,
    ShipmentListOut,
    VoyageDetail,
    VoyageListItem,
    VoyageListOut,
    WorkflowStepOut,
)
from app.infrastructure.odoo.client import OdooClient

router = APIRouter(prefix="/transport", tags=["transport"])

_read_deps = [Depends(require_permission("transport:read"))]

# ── Champs à lire depuis Odoo ─────────────────────────────────────────────────

SHIPMENT_FIELDS = [
    "id", "name", "partner_id", "transport_mode", "state",
    "date_start", "date_end", "date_order", "origin_location", "destination_location",
    "vehicle_subtype_id", "distance_km", "sale_price_unit", "planned_qty",
    "product_description", "voyage_count", "total_charges", "sale_amount",
    "margin_amount", "company_id", "currency_id", "workflow_instance_id",
]

VOYAGE_FIELDS = [
    "id", "name", "shipment_id", "transport_mode", "state", "mode_operatoire",
    "vehicle_id", "driver_id", "vehicle_subtype_id",
    "origin_location", "destination_location",
    "date_departure", "date_arrival_dest", "actual_qty_weighed",
    "distance_km", "fuel_allowance", "fuel_actual", "fuel_variance",
    "fuel_efficiency_pct", "total_charges", "company_id", "currency_id",
]

CHARGE_FIELDS = [
    "id", "name", "charge_type_id", "amount", "porteur", "state", "date",
    "voyage_id", "shipment_id",
]

IMMOB_FIELDS = [
    "id", "name", "type", "start_date", "end_date", "duration_hours", "state",
    "voyage_id", "shipment_id",
]

WORKFLOW_FIELDS = [
    "id", "shipment_id", "template_id", "current_step_id", "state",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _odoo_domain_date(field: str, date_from: date | None, date_to: date | None) -> list:
    domain: list = []
    if date_from:
        domain.append((field, ">=", str(date_from)))
    if date_to:
        domain.append((field, "<=", str(date_to)))
    return domain


def _safe_float(v: Any) -> float:
    try:
        return float(v) if v not in (None, False) else 0.0
    except (TypeError, ValueError):
        return 0.0


def _shipment_to_out(r: dict) -> ShipmentListItem:
    r["revenue"] = r.get("sale_amount")
    r["margin"] = r.get("margin_amount")
    return ShipmentListItem.from_odoo(r)


def _voyage_to_out(r: dict) -> VoyageListItem:
    return VoyageListItem.from_odoo(r)


# ── Shipments ─────────────────────────────────────────────────────────────────

@router.get("/shipments", dependencies=_read_deps)
async def list_shipments(
    state: Annotated[str | None, Query(description="draft|confirmed|in_progress|done|cancelled")] = None,
    transport_mode: Annotated[str | None, Query(description="terrestre|maritime|aerien|multimodal")] = None,
    partner_id: Annotated[int | None, Query()] = None,
    vehicle_subtype_id: Annotated[int | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ShipmentListOut:
    """Liste paginée des commandes de transport Odoo."""
    domain: list = []
    if state:
        domain.append(("state", "=", state))
    if transport_mode:
        domain.append(("transport_mode", "=", transport_mode))
    if partner_id:
        domain.append(("partner_id", "=", partner_id))
    if vehicle_subtype_id:
        domain.append(("vehicle_subtype_id", "=", vehicle_subtype_id))
    domain.extend(_odoo_domain_date("date_start", date_from, date_to))

    client = OdooClient()

    total, records = await asyncio.gather(
        asyncio.to_thread(client.execute, "transport.shipment", "search_count", [domain]),
        asyncio.to_thread(
            client.execute,
            "transport.shipment", "search_read",
            [domain],
            {"fields": SHIPMENT_FIELDS, "limit": limit, "offset": offset, "order": "id desc"},
        ),
    )

    return ShipmentListOut(
        items=[_shipment_to_out(r) for r in records],  # type: ignore[arg-type]
        total=int(total),  # type: ignore[arg-type]
        offset=offset,
        limit=limit,
    )


@router.get("/shipments/{shipment_id}", dependencies=_read_deps)
async def get_shipment(shipment_id: int) -> ShipmentDetail:
    """Détail complet d'une commande de transport avec voyages, charges, immobilisations et workflow."""
    client = OdooClient()

    records = await asyncio.to_thread(
        client.execute,
        "transport.shipment", "search_read",
        [[("id", "=", shipment_id)]],
        {"fields": SHIPMENT_FIELDS + ["product_description", "planned_qty", "date_order"]},
    )
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouvé")

    r = records[0]  # type: ignore[index]
    r["revenue"] = r.get("sale_amount")
    r["margin"] = r.get("margin_amount")

    voyages_raw, charges_raw, immobs_raw = await asyncio.gather(
        asyncio.to_thread(
            client.execute, "transport.voyage", "search_read",
            [[("shipment_id", "=", shipment_id)]],
            {"fields": VOYAGE_FIELDS},
        ),
        asyncio.to_thread(
            client.execute, "transport.charge", "search_read",
            [[("shipment_id", "=", shipment_id)]],
            {"fields": CHARGE_FIELDS},
        ),
        asyncio.to_thread(
            client.execute, "transport.immobilization", "search_read",
            [[("shipment_id", "=", shipment_id)]],
            {"fields": IMMOB_FIELDS},
        ),
    )

    # Workflow
    workflow_out: WorkflowStepOut | None = None
    wf_instance = r.get("workflow_instance_id")
    if wf_instance and isinstance(wf_instance, list):
        wf_records = await asyncio.to_thread(
            client.execute, "transport.workflow.instance", "search_read",
            [[("id", "=", wf_instance[0])]],
            {"fields": WORKFLOW_FIELDS},
        )
        if wf_records:
            wf = wf_records[0]  # type: ignore[index]
            workflow_out = WorkflowStepOut(
                instance_id=wf.get("id"),
                template=wf["template_id"][1] if isinstance(wf.get("template_id"), list) else None,
                current_step=wf["current_step_id"][1] if isinstance(wf.get("current_step_id"), list) else None,
                state=wf.get("state"),
            )

    detail = ShipmentDetail(
        **ShipmentListItem.from_odoo(r).model_dump(),
        date_order=r.get("date_order") or None,
        product_description=r.get("product_description") or None,
        planned_qty=r.get("planned_qty"),
        voyages=[VoyageListItem.from_odoo(v) for v in voyages_raw],  # type: ignore[union-attr]
        charges=[ChargeOut.from_odoo(c) for c in charges_raw],  # type: ignore[union-attr]
        immobilizations=[ImmobilizationOut.from_odoo(i) for i in immobs_raw],  # type: ignore[union-attr]
        workflow=workflow_out,
    )
    return detail


# ── Voyages ───────────────────────────────────────────────────────────────────

@router.get("/shipments/{shipment_id}/voyages", dependencies=_read_deps)
async def list_voyages(
    shipment_id: int,
    state: Annotated[str | None, Query()] = None,
    transport_mode: Annotated[str | None, Query()] = None,
    vehicle_id: Annotated[int | None, Query()] = None,
    driver_id: Annotated[int | None, Query()] = None,
    date_from: Annotated[date | None, Query()] = None,
    date_to: Annotated[date | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> VoyageListOut:
    """Liste paginée des voyages d'un dossier de transport."""
    domain: list = [("shipment_id", "=", shipment_id)]
    if state:
        domain.append(("state", "=", state))
    if transport_mode:
        domain.append(("transport_mode", "=", transport_mode))
    if vehicle_id:
        domain.append(("vehicle_id", "=", vehicle_id))
    if driver_id:
        domain.append(("driver_id", "=", driver_id))
    domain.extend(_odoo_domain_date("date_departure", date_from, date_to))

    client = OdooClient()

    total, records = await asyncio.gather(
        asyncio.to_thread(client.execute, "transport.voyage", "search_count", [domain]),
        asyncio.to_thread(
            client.execute, "transport.voyage", "search_read",
            [domain],
            {"fields": VOYAGE_FIELDS, "limit": limit, "offset": offset, "order": "id desc"},
        ),
    )

    return VoyageListOut(
        items=[VoyageListItem.from_odoo(v) for v in records],  # type: ignore[arg-type]
        total=int(total),  # type: ignore[arg-type]
        offset=offset,
        limit=limit,
    )


@router.get("/voyages/{voyage_id}", dependencies=_read_deps)
async def get_voyage(voyage_id: int) -> VoyageDetail:
    """Détail complet d'un voyage avec charges et immobilisations."""
    client = OdooClient()

    records = await asyncio.to_thread(
        client.execute, "transport.voyage", "search_read",
        [[("id", "=", voyage_id)]],
        {"fields": VOYAGE_FIELDS},
    )
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage non trouvé")

    r = records[0]  # type: ignore[index]

    charges_raw, immobs_raw = await asyncio.gather(
        asyncio.to_thread(
            client.execute, "transport.charge", "search_read",
            [[("voyage_id", "=", voyage_id)]],
            {"fields": CHARGE_FIELDS},
        ),
        asyncio.to_thread(
            client.execute, "transport.immobilization", "search_read",
            [[("voyage_id", "=", voyage_id)]],
            {"fields": IMMOB_FIELDS},
        ),
    )

    return VoyageDetail(
        **VoyageListItem.from_odoo(r).model_dump(),
        charges=[ChargeOut.from_odoo(c) for c in charges_raw],  # type: ignore[union-attr]
        immobilizations=[ImmobilizationOut.from_odoo(i) for i in immobs_raw],  # type: ignore[union-attr]
    )


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", dependencies=_read_deps)
async def get_dashboard(
    date_from: Annotated[date | None, Query(description="Début de période (ISO 8601)")] = None,
    date_to: Annotated[date | None, Query(description="Fin de période (ISO 8601)")] = None,
) -> DashboardOut:
    """Agrégations transport par mode et période."""
    client = OdooClient()

    shipment_domain: list = []
    voyage_domain: list = []
    shipment_domain.extend(_odoo_domain_date("date_start", date_from, date_to))
    voyage_domain.extend(_odoo_domain_date("date_departure", date_from, date_to))

    shipments_raw, voyages_raw = await asyncio.gather(
        asyncio.to_thread(
            client.execute, "transport.shipment", "search_read",
            [shipment_domain],
            {"fields": ["id", "transport_mode", "total_charges", "sale_amount", "margin_amount"]},
        ),
        asyncio.to_thread(
            client.execute, "transport.voyage", "search_read",
            [voyage_domain],
            {"fields": ["id", "transport_mode", "total_charges", "shipment_id"]},
        ),
    )

    # Agrégations
    mode_stats: dict[str, dict] = {}

    for s in shipments_raw:  # type: ignore[union-attr]
        mode = s.get("transport_mode") or "autre"
        if mode not in mode_stats:
            mode_stats[mode] = {"shipment_count": 0, "voyage_count": 0, "total_charges": 0.0, "revenue": 0.0, "margin": 0.0}
        mode_stats[mode]["shipment_count"] += 1
        mode_stats[mode]["total_charges"] += _safe_float(s.get("total_charges"))
        mode_stats[mode]["revenue"] += _safe_float(s.get("sale_amount"))
        mode_stats[mode]["margin"] += _safe_float(s.get("margin_amount"))

    for v in voyages_raw:  # type: ignore[union-attr]
        mode = v.get("transport_mode") or "autre"
        if mode not in mode_stats:
            mode_stats[mode] = {"shipment_count": 0, "voyage_count": 0, "total_charges": 0.0, "revenue": 0.0, "margin": 0.0}
        mode_stats[mode]["voyage_count"] += 1

    by_mode = [
        DashboardModeStats(transport_mode=mode, **stats)
        for mode, stats in mode_stats.items()
    ]

    total_shipments = len(shipments_raw)  # type: ignore[arg-type]
    total_voyages = len(voyages_raw)  # type: ignore[arg-type]
    total_charges = sum(_safe_float(s.get("total_charges")) for s in shipments_raw)  # type: ignore[union-attr]
    total_revenue = sum(_safe_float(s.get("sale_amount")) for s in shipments_raw)  # type: ignore[union-attr]
    total_margin = sum(_safe_float(s.get("margin_amount")) for s in shipments_raw)  # type: ignore[union-attr]

    return DashboardOut(
        period_from=date_from,
        period_to=date_to,
        total_shipments=total_shipments,
        total_voyages=total_voyages,
        total_charges=total_charges,
        total_revenue=total_revenue,
        total_margin=total_margin,
        by_mode=by_mode,
    )
