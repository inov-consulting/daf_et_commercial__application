"""KPI : Chiffre d'affaires du mois.

Source : Odoo — transport.shipment
Agrège sale_amount par mois sur les dossiers confirmés/terminés.
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
        client.execute,
        "transport.shipment",
        "search_read",
        [domain],
        {"fields": ["date_order", "sale_amount", "currency_id"], "limit": 5000},
    )  # type: ignore[assignment]

    monthly: dict[str, float] = defaultdict(float)
    for r in records:
        raw_date = r.get("date_order")
        if not raw_date:
            continue
        month = str(raw_date)[:7]
        amount = r.get("sale_amount") or 0.0
        try:
            monthly[month] += float(amount)
        except (TypeError, ValueError):
            pass

    data = [
        {"month": m, "ca": round(v, 2)}
        for m, v in sorted(monthly.items())
    ]

    return KpiChartData(
        data=data,
        series=[AgSeries(type="bar", xKey="month", yKey="ca", yName="CA (XOF)")],
    )
