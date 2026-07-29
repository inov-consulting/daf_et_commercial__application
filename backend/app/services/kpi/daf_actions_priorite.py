"""KPI : Répartition des actions proposées par priorité et par type.

Bar chart groupé : nombre d'actions par type, coloré par priorité.
Source : daf_proposed_actions (Portalis DB)
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData

_TYPE_LABELS = {
    "send_reminder": "Relance",
    "escalate_debt": "Escalade dette",
    "flag_account": "Signalement compte",
    "contact_supplier": "Contact fournisseur",
    "payment_plan": "Plan de paiement",
    "review_credit_policy": "Politique crédit",
    "other": "Autre",
}

_PRIORITY_LABELS = {
    "critical": "Critique",
    "high": "Haute",
    "medium": "Moyenne",
    "low": "Basse",
}


async def compute(date_from: date | None = None, date_to: date | None = None, erp_company_id: int | None = None, company_id=None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    qs = DafProposedActionOrm.all()
    if company_id:
        qs = qs.filter(run__company_id=company_id)
    if date_from:
        qs = qs.filter(proposed_at__gte=date_from)
    if date_to:
        qs = qs.filter(proposed_at__lte=date_to)

    actions = await qs

    # Regrouper par type + priorité
    by_type: dict[str, dict[str, int]] = defaultdict(lambda: {p: 0 for p in _PRIORITY_LABELS})
    for a in actions:
        atype = _TYPE_LABELS.get(a.action_type, a.action_type)
        priority = _PRIORITY_LABELS.get(a.priority, a.priority)
        by_type[atype][priority] = by_type[atype].get(priority, 0) + 1

    data = [
        {"type": atype, **counts}
        for atype, counts in by_type.items()
    ]

    return KpiChartData(
        data=data,
        series=[
            AgSeries(type="bar", xKey="type", yKey=label, yName=label)
            for label in _PRIORITY_LABELS.values()
        ],
    )
