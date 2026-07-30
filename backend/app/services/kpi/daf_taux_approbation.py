"""KPI : Taux d'approbation des actions proposées par l'agent DAF.

Indique si le DAF humain fait confiance aux propositions de l'agent.
Bar chart : approuvées vs rejetées, avec taux en légende.
Source : daf_proposed_actions (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None, erp_company_id: int | None = None, company_id=None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    qs = DafProposedActionOrm.filter(status__in=["approved", "rejected"])
    if company_id:
        qs = qs.filter(run__company_id=company_id)
    if date_from:
        qs = qs.filter(decided_at__gte=date_from)
    if date_to:
        qs = qs.filter(decided_at__lte=date_to)

    approved = await qs.filter(status="approved").count()
    rejected = await qs.filter(status="rejected").count()
    decided = approved + rejected

    taux = round((approved / decided * 100), 1) if decided > 0 else 0.0

    return KpiChartData(
        data=[
            {"decision": "Approuvées", "nombre": approved},
            {"decision": "Rejetées", "nombre": rejected},
        ],
        series=[
            AgSeries(
                type="bar",
                xKey="decision",
                yKey="nombre",
                yName=f"Taux d'approbation : {taux} %",
            )
        ],
    )
