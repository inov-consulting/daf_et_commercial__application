"""KPI : Délai moyen de décision sur les actions proposées par le DAF agent.

Délai = temps entre proposed_at et decided_at.
Bar chart par tranche (< 1h, 1h-24h, 1j-7j, > 7j).
Source : daf_proposed_actions (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    qs = DafProposedActionOrm.filter(
        status__in=["approved", "rejected"],
        decided_at__not_isnull=True,
    )
    if date_from:
        qs = qs.filter(proposed_at__gte=date_from)
    if date_to:
        qs = qs.filter(proposed_at__lte=date_to)

    actions = await qs

    buckets = {"< 1h": 0, "1h – 24h": 0, "1j – 7j": 0, "> 7j": 0}
    total_seconds = 0.0

    for a in actions:
        delta = (a.decided_at - a.proposed_at).total_seconds()
        total_seconds += delta
        hours = delta / 3600
        if hours < 1:
            buckets["< 1h"] += 1
        elif hours < 24:
            buckets["1h – 24h"] += 1
        elif hours < 168:
            buckets["1j – 7j"] += 1
        else:
            buckets["> 7j"] += 1

    avg_hours = round(total_seconds / len(actions) / 3600, 1) if actions else 0.0

    data = [{"tranche": k, "nombre": v} for k, v in buckets.items() if v > 0]

    return KpiChartData(
        data=data,
        series=[
            AgSeries(
                type="bar",
                xKey="tranche",
                yKey="nombre",
                yName=f"Délai moyen : {avg_hours}h",
            )
        ],
    )
