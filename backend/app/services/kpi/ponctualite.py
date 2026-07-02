"""KPI : Taux de livraison à temps (ponctualité).

Source : Odoo — transport.voyage
Compare date_arrival_dest (réelle) vs date prévue dans le shipment.
Un voyage est ponctuel si date_arrival_dest <= date_end du dossier parent.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData
from app.infrastructure.odoo.client import OdooClient


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    client = OdooClient()
    domain: list = [("state", "in", ["done"])]
    if date_from:
        domain.append(("date_departure", ">=", str(date_from)))
    if date_to:
        domain.append(("date_departure", "<=", str(date_to)))

    voyages: list[dict] = await asyncio.to_thread(
        client.execute,
        "transport.voyage",
        "search_read",
        [domain],
        {"fields": ["date_departure", "date_arrival_dest", "shipment_id"], "limit": 5000},
    )  # type: ignore[assignment]

    if not voyages:
        return KpiChartData(
            data=[],
            series=[AgSeries(type="bar", xKey="month", yKey="taux", yName="Ponctualité (%)")],
        )

    shipment_ids = list({
        v["shipment_id"][0]
        for v in voyages
        if v.get("shipment_id")
    })

    shipments_raw: list[dict] = await asyncio.to_thread(
        client.execute,
        "transport.shipment",
        "search_read",
        [[("id", "in", shipment_ids)]],
        {"fields": ["id", "date_end"], "limit": len(shipment_ids) + 1},
    )  # type: ignore[assignment]

    shipment_date_end: dict[int, str] = {
        s["id"]: s.get("date_end") or ""
        for s in shipments_raw
    }

    monthly_total: dict[str, int] = defaultdict(int)
    monthly_on_time: dict[str, int] = defaultdict(int)

    for v in voyages:
        raw_dep = v.get("date_departure")
        if not raw_dep:
            continue
        month = str(raw_dep)[:7]
        monthly_total[month] += 1

        arr = v.get("date_arrival_dest") or ""
        ship_id = v["shipment_id"][0] if v.get("shipment_id") else None
        due = shipment_date_end.get(ship_id, "") if ship_id else ""

        if arr and due and arr <= due:
            monthly_on_time[month] += 1

    data = []
    for month in sorted(monthly_total):
        total = monthly_total[month]
        on_time = monthly_on_time.get(month, 0)
        taux = round(on_time / total * 100, 1) if total else 0.0
        data.append({"month": month, "taux": taux, "total": total, "a_temps": on_time})

    return KpiChartData(
        data=data,
        series=[AgSeries(type="bar", xKey="month", yKey="taux", yName="Ponctualité (%)")],
    )
