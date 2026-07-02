"""KPI : Marge par dossier.

Source : Odoo — transport.shipment
Retourne le montant de marge pour chaque dossier sur la période.
"""
from __future__ import annotations

import asyncio
from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData
from app.infrastructure.odoo.client import OdooClient


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    client = OdooClient()
    domain: list = [("state", "in", ["confirmed", "done", "in_progress"])]
    if date_from:
        domain.append(("date_order", ">=", str(date_from)))
    if date_to:
        domain.append(("date_order", "<=", str(date_to)))

    records: list[dict] = await asyncio.to_thread(
        client.execute,
        "transport.shipment",
        "search_read",
        [domain],
        {"fields": ["name", "margin_amount", "sale_amount", "date_order"], "limit": 200},
    )  # type: ignore[assignment]

    data = []
    for r in records:
        try:
            marge = float(r.get("margin_amount") or 0)
            ca = float(r.get("sale_amount") or 0)
            taux = round(marge / ca * 100, 1) if ca else 0.0
        except (TypeError, ValueError):
            marge, taux = 0.0, 0.0

        data.append({
            "dossier": r.get("name", f"#{r['id']}"),
            "marge": round(marge, 2),
            "taux_marge": taux,
        })

    data.sort(key=lambda x: x["marge"], reverse=True)

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="bar", xKey="dossier", yKey="marge", yName="Marge (XOF)"),
        ],
    )
