"""KPI : Liste des factures fournisseurs impayées (dettes en retard).

Retourne le détail de chaque facture fournisseur en retard de paiement
extraite du dernier snapshot DAF (raw_data → overdue_payables_detail).

Source : daf_financial_snapshots.raw_data (Portalis DB)
"""
from __future__ import annotations

from datetime import date

from app.api.v1.schemas.kpi import AgSeries, KpiChartData


async def compute(date_from: date | None = None, date_to: date | None = None, erp_company_id: int | None = None, company_id=None) -> KpiChartData:
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    # Prendre le snapshot le plus récent dans la période demandée
    qs = DafFinancialSnapshotOrm.all()
    if company_id:
        qs = qs.filter(run__company_id=company_id)
    if date_from:
        qs = qs.filter(snapshot_at__gte=date_from)
    if date_to:
        qs = qs.filter(snapshot_at__lte=date_to)

    snapshot = await qs.order_by("-snapshot_at").first()

    if not snapshot or not snapshot.raw_data:
        return KpiChartData(data=[], series=[])

    invoices: list[dict] = snapshot.raw_data.get("overdue_payables_detail") or []

    data = [
        {
            "numero": inv.get("name", "—"),
            "fournisseur": inv.get("partner_name", "—"),
            "montant": round(float(inv.get("amount_residual") or 0), 0),
            "date_facture": inv.get("invoice_date", "—"),
            "echeance": inv.get("invoice_date_due", "—"),
            "jours_retard": int(inv.get("days_overdue") or 0),
            "devise": inv.get("currency", "XOF"),
        }
        for inv in invoices
    ]

    # Triées par jours de retard décroissant (les plus urgentes en premier)
    data.sort(key=lambda x: x["jours_retard"], reverse=True)

    return KpiChartData(data=data, series=[])
