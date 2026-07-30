"""KPI : Nombre de dossiers par statut.

Source : Odoo — transport.shipment
Répartition des dossiers selon leur statut (draft, confirmed, in_progress, done, cancelled).
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
        ["state"],
    )

    counts: dict[str, int] = {}
    for r in records:
        state = r.get("state") or "unknown"
        counts[state] = counts.get(state, 0) + 1

    data = [
        {
            "statut": _STATE_LABELS.get(state, state),
            "statut_key": state,
            "count": count,
        }
        for state, count in sorted(counts.items(), key=lambda x: -x[1])
    ]

    return KpiChartData(
        data=data,
        series=[
            AgSeries(
                type="pie",
                angleKey="count",
                calloutLabelKey="statut",
                yName="Dossiers",
            ),
        ],
    )
