"""KPI : Évolution des créances clients en retard dans le temps.

Line chart groupé : total créances vs créances en retard (depuis snapshots DAF).
Source : daf_financial_snapshots (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    qs = DafFinancialSnapshotOrm.all()
    if date_from:
        qs = qs.filter(snapshot_at__gte=date_from)
    if date_to:
        qs = qs.filter(snapshot_at__lte=date_to)

    snapshots = await qs.order_by("snapshot_at")

    data = [
        {
            "date": s.snapshot_at.strftime("%Y-%m-%d %H:%M"),
            "total": round(float(s.total_receivables or 0), 0),
            "en_retard": round(float(s.overdue_receivables or 0), 0),
        }
        for s in snapshots
    ]

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="line", xKey="date", yKey="total", yName="Total créances"),
            AgSeries(type="line", xKey="date", yKey="en_retard", yName="En retard"),
        ],
    )
