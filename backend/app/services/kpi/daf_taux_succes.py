"""KPI : Taux de succès des cycles DAF.

Stat unique : % de cycles completed vs total.
Retourné sous forme de bar chart à une valeur (compatible AG Charts stat tile).
Source : daf_agent_runs (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafAgentRunOrm

    qs = DafAgentRunOrm.all()
    if date_from:
        qs = qs.filter(started_at__gte=date_from)
    if date_to:
        qs = qs.filter(started_at__lte=date_to)

    total = await qs.count()
    completed = await qs.filter(status="completed").count()
    failed = await qs.filter(status="failed").count()

    taux = round((completed / total * 100), 1) if total > 0 else 0.0

    return KpiChartData(
        data=[
            {"label": "Complétés", "valeur": completed},
            {"label": "Échoués", "valeur": failed},
        ],
        series=[
            AgSeries(
                type="bar",
                xKey="label",
                yKey="valeur",
                yName=f"Taux de succès : {taux} % ({total} cycles)",
            )
        ],
    )
