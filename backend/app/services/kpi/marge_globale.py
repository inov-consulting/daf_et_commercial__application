"""KPI : Marge globale (%).

Source : Odoo — transport.shipment
Calcule le taux de marge moyen mensuel (margin_amount / sale_amount * 100).
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
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
        client.fetch_all,
        "transport.shipment",
        domain,
        ["date_order", "sale_amount", "margin_amount"],
    )

    monthly_ca: dict[str, float] = defaultdict(float)
    monthly_marge: dict[str, float] = defaultdict(float)

    for r in records:
        raw_date = r.get("date_order")
        if not raw_date:
            continue
        month = str(raw_date)[:7]
        try:
            monthly_ca[month] += float(r.get("sale_amount") or 0)
            monthly_marge[month] += float(r.get("margin_amount") or 0)
        except (TypeError, ValueError):
            pass

    data = []
    for month in sorted(monthly_ca):
        ca = monthly_ca[month]
        marge = monthly_marge[month]
        taux = round((marge / ca * 100), 2) if ca else 0.0
        data.append({"month": month, "taux_marge": taux})

    return KpiChartData(
        data=data,
        series=[AgSeries(type="line", xKey="month", yKey="taux_marge", yName="Marge (%)")],
    )
