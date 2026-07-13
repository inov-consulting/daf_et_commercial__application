"""KPI : Répartition des actions proposées par l'agent DAF par statut.

Pie chart : pending / approved / rejected / executed / failed.
Source : daf_proposed_actions (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData

_STATUS_LABELS = {
    "pending": "En attente",
    "approved": "Approuvées",
    "rejected": "Rejetées",
    "executed": "Exécutées",
    "failed": "Échouées",
}


async def compute(date_from: date | None = None, date_to: date | None = None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    qs = DafProposedActionOrm.all()
    if date_from:
        qs = qs.filter(proposed_at__gte=date_from)
    if date_to:
        qs = qs.filter(proposed_at__lte=date_to)

    data = []
    for status, label in _STATUS_LABELS.items():
        count = await qs.filter(status=status).count()
        if count > 0:
            data.append({"statut": label, "nombre": count})

    return KpiChartData(
        data=data,
        series=[
            AgSeries(
                type="pie",
                angleKey="nombre",
                calloutLabelKey="statut",
                yName="Actions proposées",
            )
        ],
    )
