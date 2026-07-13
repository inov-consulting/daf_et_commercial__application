"""KPI : Évolution du DSO (Days Sales Outstanding) dans le temps.

Line chart depuis les snapshots financiers de l'agent DAF.
Source : daf_financial_snapshots (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    qs = DafFinancialSnapshotOrm.filter(dso_days__not_isnull=True)
    if date_from:
        qs = qs.filter(snapshot_at__gte=date_from)
    if date_to:
        qs = qs.filter(snapshot_at__lte=date_to)

    snapshots = await qs.order_by("snapshot_at")

    data = [
        {
            "date": s.snapshot_at.strftime("%Y-%m-%d %H:%M"),
            "dso": round(float(s.dso_days), 1),
        }
        for s in snapshots
        if s.dso_days is not None
    ]

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="line", xKey="date", yKey="dso", yName="DSO (jours)"),
        ],
    )
