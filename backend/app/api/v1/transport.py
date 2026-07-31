"""Router API Transport — lecture seule des données Odoo 19.

Connexion via XML-RPC en utilisant OdooClient.execute().
Toutes les requêtes Odoo sont exécutées dans asyncio.to_thread pour ne pas bloquer.
"""
from __future__ import annotations

import asyncio
from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentCompany, require_permission
from app.api.v1.schemas.transport import (
    ChargeOut,
    DashboardModeStats,
    DashboardOut,
    ImmobilizationOut,
    NextStepIn,
    NextStepOut,
    ShipmentDetail,
    ShipmentListItem,
    ShipmentListOut,
    VoyageDetail,
    VoyageListItem,
    VoyageListOut,
    WorkflowHistoryOut,
    WorkflowStepItemOut,
    WorkflowStepOut,
)
from app.core.logging import get_logger
from app.infrastructure.odoo.client import OdooClient

logger = get_logger(__name__)

router = APIRouter(prefix="/transport", tags=["transport"])

_read_deps   = [Depends(require_permission("transport:read"))]
_create_deps = [Depends(require_permission("transport:create"))]

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
    "id", "name", "charge_type_id", "amount", "porteur", "state", "date_charge",
    "source", "voyage_id", "shipment_id",
]

IMMOB_FIELDS = [
    "id", "name", "immob_type", "date_start", "date_end", "duration_hours",
    "state", "location", "cause_description", "voyage_id", "shipment_id",
]

WORKFLOW_FIELDS = [
    "id", "shipment_id", "template_id", "current_step_id", "state",
]

WORKFLOW_HISTORY_FIELDS = [
    "id", "instance_id", "step_id", "date_entered", "date_exited", "duration_hours", "user_id", "note",
]

WORKFLOW_STEP_FIELDS = ["id", "name", "code", "sequence", "template_id"]


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


async def _safe_read(client: OdooClient, model: str, fields: list[str], domain: list) -> list[dict]:
    try:
        return await asyncio.to_thread(
            client.execute, model, "search_read",
            [domain],
            {"fields": fields},
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("odoo.read_failed", model=model, error=str(exc))
        return []


def _shipment_to_out(r: dict) -> ShipmentListItem:
    r["revenue"] = r.get("sale_amount")
    r["margin"] = r.get("margin_amount")
    return ShipmentListItem.from_odoo(r)


def _voyage_to_out(r: dict) -> VoyageListItem:
    return VoyageListItem.from_odoo(r)


# ── Shipments ─────────────────────────────────────────────────────────────────

@router.get("/shipments", dependencies=_read_deps)
async def list_shipments(
    company: CurrentCompany,
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
    if company.erp_id:
        domain.append(("company_id", "=", company.erp_id))
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
async def get_shipment(shipment_id: int, company: CurrentCompany) -> ShipmentDetail:
    """Détail complet d'une commande de transport avec voyages, charges, immobilisations et workflow."""
    client = OdooClient()

    domain = [("id", "=", shipment_id)]
    if company.erp_id:
        domain.append(("company_id", "=", company.erp_id))
    records = await asyncio.to_thread(
        client.execute,
        "transport.shipment", "search_read",
        [domain],
        {"fields": SHIPMENT_FIELDS + ["product_description", "planned_qty", "date_order"]},
    )
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouvé")

    r = records[0]  # type: ignore[index]
    r["revenue"] = r.get("sale_amount")
    r["margin"] = r.get("margin_amount")

    voyages_raw, charges_raw, immobs_raw = await asyncio.gather(
        _safe_read(client, "transport.voyage", VOYAGE_FIELDS, [("shipment_id", "=", shipment_id)]),
        _safe_read(client, "transport.charge", CHARGE_FIELDS, [("shipment_id", "=", shipment_id)]),
        _safe_read(client, "transport.immobilization", IMMOB_FIELDS, [("shipment_id", "=", shipment_id)]),
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
            template_raw = wf.get("template_id")
            template_id_val: int | None = template_raw[0] if isinstance(template_raw, list) else None
            current_step_raw = wf.get("current_step_id")
            current_step_id_val: int | None = current_step_raw[0] if isinstance(current_step_raw, list) else None

            history_records, step_records = await asyncio.gather(
                _safe_read(
                    client,
                    "transport.workflow.history",
                    WORKFLOW_HISTORY_FIELDS,
                    [("instance_id", "=", wf.get("id"))],
                ),
                _safe_read(
                    client,
                    "transport.workflow.step",
                    WORKFLOW_STEP_FIELDS,
                    [("template_id", "=", template_id_val)] if template_id_val else [],
                ),
            )
            step_records_sorted = sorted(step_records, key=lambda s: (s.get("sequence") or 0))
            workflow_out = WorkflowStepOut(
                instance_id=wf.get("id"),
                template=template_raw[1] if isinstance(template_raw, list) else None,
                current_step=current_step_raw[1] if isinstance(current_step_raw, list) else None,
                current_step_id=current_step_id_val,
                state=wf.get("state"),
                steps=[
                    WorkflowStepItemOut.from_odoo(s, current_step_id=current_step_id_val)
                    for s in step_records_sorted
                ],
                history=[WorkflowHistoryOut.from_odoo(h) for h in history_records],
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


@router.post("/shipments/{shipment_id}/next-step", dependencies=_create_deps)
async def shipment_next_step(
    shipment_id: int,
    body: NextStepIn,
) -> NextStepOut:
    """Avance le dossier transport à l'étape suivante du workflow.

    Retourne l'étape précédente, l'étape courante et la prochaine étape disponible.
    Erreurs formatées si la transition est impossible (dossier annulé, déjà terminé, etc.).
    """
    client = OdooClient()

    # 1. Vérifier que le dossier existe et récupérer son état actuel
    records = await asyncio.to_thread(
        client.execute, "transport.shipment", "search_read",
        [[("id", "=", shipment_id)]],
        {"fields": ["id", "name", "state", "workflow_instance_id"]},
    )
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouvé")

    shipment = records[0]  # type: ignore[index]
    shipment_name = shipment.get("name", str(shipment_id))

    # 2. Gardes : états terminaux
    current_state = shipment.get("state", "")
    if current_state == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SHIPMENT_CANCELLED",
                "message": f"Le dossier {shipment_name} est annulé. Impossible d'avancer dans le workflow.",
                "current_state": current_state,
            },
        )
    if current_state == "done":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SHIPMENT_DONE",
                "message": f"Le dossier {shipment_name} est déjà terminé.",
                "current_state": current_state,
            },
        )

    # 3. Récupérer l'instance de workflow
    wf_raw = shipment.get("workflow_instance_id")
    wf_instance_id = wf_raw[0] if isinstance(wf_raw, list) else None
    if not wf_instance_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "NO_WORKFLOW",
                "message": f"Aucun workflow actif sur le dossier {shipment_name}.",
            },
        )

    wf_records = await asyncio.to_thread(
        client.execute, "transport.workflow.instance", "search_read",
        [[("id", "=", wf_instance_id)]],
        {"fields": WORKFLOW_FIELDS},
    )
    if not wf_records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WORKFLOW_NOT_FOUND", "message": "Instance de workflow introuvable."},
        )

    wf = wf_records[0]  # type: ignore[index]
    current_step_raw = wf.get("current_step_id")
    current_step_id = current_step_raw[0] if isinstance(current_step_raw, list) else None
    previous_step_name = current_step_raw[1] if isinstance(current_step_raw, list) else None
    template_raw = wf.get("template_id")
    template_id = template_raw[0] if isinstance(template_raw, list) else None

    # 4. Récupérer toutes les étapes triées
    step_records = await _safe_read(
        client, "transport.workflow.step",
        WORKFLOW_STEP_FIELDS,
        [("template_id", "=", template_id)] if template_id else [],
    )
    steps_sorted = sorted(step_records, key=lambda s: (s.get("sequence") or 0))

    # Ignorer l'étape CANCELLED (sequence 999) pour le flux normal
    normal_steps = [s for s in steps_sorted if s.get("code") != "CANCELLED"]

    # Trouver l'index de l'étape courante
    current_idx = next(
        (i for i, s in enumerate(normal_steps) if s.get("id") == current_step_id), None
    )
    if current_idx is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "STEP_NOT_FOUND",
                "message": "L'étape courante est introuvable dans le template de workflow.",
                "current_step_id": current_step_id,
            },
        )

    if current_idx >= len(normal_steps) - 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_LAST_STEP",
                "message": f"Le dossier {shipment_name} est déjà à la dernière étape « {previous_step_name} ».",
                "current_step": previous_step_name,
            },
        )

    next_step = normal_steps[current_idx + 1]
    next_step_id = next_step.get("id")

    # 5. Transition : write direct sur current_step_id + gestion historique
    from datetime import datetime as _dt
    now_iso = _dt.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    try:
        # a) Clôturer l'entrée d'historique courante (date_exited = maintenant)
        open_history = await asyncio.to_thread(
            client.execute, "transport.workflow.history", "search_read",
            [[("instance_id", "=", wf_instance_id), ("step_id", "=", current_step_id), ("date_exited", "=", False)]],
            {"fields": ["id"], "limit": 1},
        )
        if open_history:
            await asyncio.to_thread(
                client.execute, "transport.workflow.history", "write",
                [[open_history[0]["id"]], {"date_exited": now_iso}],  # type: ignore[index]
            )

        # b) Avancer l'étape courante sur l'instance
        await asyncio.to_thread(
            client.execute, "transport.workflow.instance", "write",
            [[wf_instance_id], {"current_step_id": next_step_id}],
        )

        # c) Créer la nouvelle entrée d'historique
        history_vals: dict = {
            "instance_id": wf_instance_id,
            "step_id": next_step_id,
            "date_entered": now_iso,
        }
        if body.note:
            history_vals["note"] = body.note
        await asyncio.to_thread(
            client.execute, "transport.workflow.history", "create",
            [history_vals],
        )

    except Exception as exc:
        err_msg = str(exc)
        if "Missing required" in err_msg or "mandatory" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "MISSING_REQUIRED_FIELD", "message": err_msg},
            )
        if "access" in err_msg.lower() or "permission" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "ODOO_ACCESS_DENIED", "message": "Droits insuffisants pour cette transition."},
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "ODOO_ERROR", "message": err_msg},
        )

    # 6. Relire l'état réel après la transition
    wf_after = await asyncio.to_thread(
        client.execute, "transport.workflow.instance", "search_read",
        [[("id", "=", wf_instance_id)]],
        {"fields": WORKFLOW_FIELDS},
    )
    wf_new = wf_after[0] if wf_after else wf  # type: ignore[index]
    new_step_raw = wf_new.get("current_step_id")
    new_step_name = new_step_raw[1] if isinstance(new_step_raw, list) else next_step.get("name", "")
    new_step_id = new_step_raw[0] if isinstance(new_step_raw, list) else next_step_id

    # Prochaine étape après la transition
    new_idx = next((i for i, s in enumerate(normal_steps) if s.get("id") == new_step_id), current_idx + 1)
    after_next = normal_steps[new_idx + 1] if new_idx + 1 < len(normal_steps) else None

    return NextStepOut(
        shipment_id=shipment_id,
        shipment_name=shipment_name,
        previous_step=previous_step_name,
        current_step=str(new_step_name),
        current_step_code=next_step.get("code"),
        next_step=after_next.get("name") if after_next else None,
        next_step_code=after_next.get("code") if after_next else None,
        workflow_state=str(wf_new.get("state") or "running"),
    )


# ── Voyages ────────────────────────────────────────────────────────────────────

@router.get("/shipments/{shipment_id}/voyages", dependencies=_read_deps)
async def list_voyages(
    shipment_id: int,
    company: CurrentCompany,
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
    if company.erp_id:
        domain.append(("company_id", "=", company.erp_id))
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
async def get_voyage(voyage_id: int, company: CurrentCompany) -> VoyageDetail:
    """Détail complet d'un voyage avec charges et immobilisations."""
    client = OdooClient()

    voyage_domain = [("id", "=", voyage_id)]
    if company.erp_id:
        voyage_domain.append(("company_id", "=", company.erp_id))
    records = await asyncio.to_thread(
        client.execute, "transport.voyage", "search_read",
        [voyage_domain],
        {"fields": VOYAGE_FIELDS},
    )
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage non trouvé")

    r = records[0]  # type: ignore[index]

    charges_raw, immobs_raw = await asyncio.gather(
        _safe_read(client, "transport.charge", CHARGE_FIELDS, [("voyage_id", "=", voyage_id)]),
        _safe_read(client, "transport.immobilization", IMMOB_FIELDS, [("voyage_id", "=", voyage_id)]),
    )

    return VoyageDetail(
        **VoyageListItem.from_odoo(r).model_dump(),
        charges=[ChargeOut.from_odoo(c) for c in charges_raw],
        immobilizations=[ImmobilizationOut.from_odoo(i) for i in immobs_raw],
    )


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", dependencies=_read_deps)
async def get_dashboard(
    company: CurrentCompany,
    date_from: Annotated[date | None, Query(description="Début de période (ISO 8601)")] = None,
    date_to: Annotated[date | None, Query(description="Fin de période (ISO 8601)")] = None,
) -> DashboardOut:
    """Agrégations transport par mode et période."""
    client = OdooClient()

    shipment_domain: list = [("company_id", "=", company.erp_id)] if company.erp_id else []
    voyage_domain: list = [("company_id", "=", company.erp_id)] if company.erp_id else []
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
