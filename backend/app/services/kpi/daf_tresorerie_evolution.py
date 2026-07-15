"""KPI : État de la trésorerie — vue mensuelle de l'année en cours.

Bar chart groupé : flux entrant (créances) + flux sortant (dettes) + position trésorerie.
Groupé par mois, dernier snapshot du mois retenu.
Source : daf_financial_snapshots (Portalis DB)
"""
from __future__ import annotations

from datetime import date
from collections import defaultdict

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    # Par défaut : année en cours
    current_year = date.today().year
    effective_from = date_from or date(current_year, 1, 1)
    effective_to = date_to or date(current_year, 12, 31)

    snapshots = await (
        DafFinancialSnapshotOrm
        .filter(snapshot_at__gte=effective_from, snapshot_at__lte=effective_to)
        .order_by("snapshot_at")
    )

    # Garder le dernier snapshot par mois (period_label "YYYY-MM")
    by_month: dict[str, object] = {}
    for s in snapshots:
        # period_label peut être "2026-07" ou dérivé de snapshot_at
        month_key = s.period_label[:7] if s.period_label else s.snapshot_at.strftime("%Y-%m")
        by_month[month_key] = s  # écrase → dernier snapshot du mois

    MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
            "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

    data = []
    for month_key in sorted(by_month):
        s = by_month[month_key]
        try:
            mois_num = int(month_key[5:7])
            label = f"{MOIS[mois_num - 1]} {month_key[:4]}"
        except (ValueError, IndexError):
            label = month_key

        data.append({
            "mois": label,
            "flux_entrant": round(float(s.total_receivables or 0), 0),
            "flux_sortant": round(float(s.total_payables or 0), 0),
            "tresorerie": round(float(s.cash_position or 0), 0),
        })

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="bar", xKey="mois", yKey="flux_entrant", yName="Flux entrant (créances)"),
            AgSeries(type="bar", xKey="mois", yKey="flux_sortant", yName="Flux sortant (dépenses)"),
            AgSeries(type="line", xKey="mois", yKey="tresorerie", yName="Trésorerie nette"),
        ],
    )
"""KPI : Évolution de la trésorerie dans le temps.

Area chart depuis les snapshots financiers de l'agent DAF.
Source : daf_financial_snapshots (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    qs = DafFinancialSnapshotOrm.filter(cash_position__not_isnull=True)
    if date_from:
        qs = qs.filter(snapshot_at__gte=date_from)
    if date_to:
        qs = qs.filter(snapshot_at__lte=date_to)

    snapshots = await qs.order_by("snapshot_at")

    data = [
        {
            "date": s.snapshot_at.strftime("%Y-%m-%d %H:%M"),
            "tresorerie": round(float(s.cash_position), 0),
        }
        for s in snapshots
        if s.cash_position is not None
    ]

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="area", xKey="date", yKey="tresorerie", yName="Trésorerie (XOF)"),
        ],
    )
