"""KPI : Évolution du chiffre d'affaires (CA facturé) dans le temps.

Line chart depuis les snapshots financiers de l'agent DAF.
Source : daf_financial_snapshots.raw_data["ca_period"] (Portalis DB)
Les données proviennent de account.move (factures Odoo) filtrées par company_id.
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None, erp_company_id: int | None = None, company_id=None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    qs = DafFinancialSnapshotOrm.filter(raw_data__not_isnull=True)
    if company_id:
        qs = qs.filter(run__company_id=company_id)
    if date_from:
        qs = qs.filter(snapshot_at__gte=date_from)
    if date_to:
        qs = qs.filter(snapshot_at__lte=date_to)

    snapshots = await qs.order_by("snapshot_at")

    data = []
    for s in snapshots:
        ca = (s.raw_data or {}).get("ca_period")
        if ca is None:
            continue
        data.append({
            "date": s.snapshot_at.strftime("%Y-%m-%d %H:%M"),
            "ca": round(float(ca), 0),
        })

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="line", xKey="date", yKey="ca", yName="CA facturé (XOF)"),
        ],
    )
