"""KPI : Activité des cycles de l'agent DAF.

Bar chart groupé : nombre de cycles par jour, coloré par statut (completed vs failed).
Source : daf_agent_runs (Portalis DB)
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None, erp_company_id: int | None = None, company_id=None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafAgentRunOrm

    qs = DafAgentRunOrm.all()
    if company_id:
        qs = qs.filter(company_id=company_id)
    if date_from:
        qs = qs.filter(started_at__gte=date_from)
    if date_to:
        qs = qs.filter(started_at__lte=date_to)

    runs = await qs.order_by("started_at")

    by_day: dict[str, dict[str, int]] = defaultdict(lambda: {"completed": 0, "failed": 0, "running": 0})
    for r in runs:
        day = r.started_at.strftime("%Y-%m-%d")
        status = r.status if r.status in ("completed", "failed", "running") else "other"
        by_day[day][status] = by_day[day].get(status, 0) + 1

    data = [
        {"day": day, **counts}
        for day, counts in sorted(by_day.items())
    ]

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="bar", xKey="day", yKey="completed", yName="Complétés"),
            AgSeries(type="bar", xKey="day", yKey="failed", yName="Échoués"),
        ],
    )
