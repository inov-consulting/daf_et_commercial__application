"""KPI : Statistiques globales des dossiers transport.

Source : Odoo — transport.shipment
Compteurs simples : total, par statut, facturés vs non facturés.

Champs utilisés :
  - state         : statut Odoo (draft, confirmed, in_progress, done, cancelled)
  - invoice_count : nombre de factures liées (> 0 = facturé)
"""
from __future__ import annotations

import asyncio
from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData
from app.infrastructure.odoo.client import OdooClient

_STATE_LABELS: dict[str, str] = {
    "draft": "Brouillon",
    "confirmed": "Confirmé",
    "in_progress": "En cours",
    "done": "Terminé",
    "cancelled": "Annulé",
}


async def compute(date_from: date | None = None, date_to: date | None = None, erp_company_id: int | None = None, company_id=None) -> KpiChartData:
    client = OdooClient()

    domain: list = []
    if erp_company_id:
        domain.append(("company_id", "=", erp_company_id))
    if date_from:
        domain.append(("date_order", ">=", str(date_from)))
    if date_to:
        domain.append(("date_order", "<=", str(date_to)))

    records: list[dict] = await asyncio.to_thread(
        client.fetch_all,
        "transport.shipment",
        domain,
        ["state", "invoice_count"],
    )

    total = len(records)
    counts_by_state: dict[str, int] = {}
    factures = 0
    non_factures = 0

    for r in records:
        state = r.get("state") or "unknown"
        counts_by_state[state] = counts_by_state.get(state, 0) + 1

        inv = r.get("invoice_count") or 0
        if inv > 0:
            factures += 1
        else:
            non_factures += 1

    # ── data : une ligne par compteur pour un graphe en barres ──────────────
    data = [
        {"label": "Total", "valeur": total, "groupe": "global"},
    ]
    for state, count in counts_by_state.items():
        data.append({
            "label": _STATE_LABELS.get(state, state),
            "valeur": count,
            "groupe": "statut",
        })
    data.append({"label": "Facturés", "valeur": factures, "groupe": "facturation"})
    data.append({"label": "Non facturés", "valeur": non_factures, "groupe": "facturation"})

    return KpiChartData(
        data=data,
        series=[
            AgSeries(
                type="bar",
                xKey="label",
                yKey="valeur",
                yName="Nombre de dossiers",
            ),
        ],
    )
