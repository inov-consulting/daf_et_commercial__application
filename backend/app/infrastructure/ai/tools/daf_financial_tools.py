"""Outils financiers Odoo pour l'agent DAF.

Ces fonctions sont appelées directement par le service DafAgent (pas via LangChain tool wrapper).
Elles utilisent OdooClient pour interroger account.move, res.partner, account.payment.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timezone

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _today() -> str:
    return date.today().isoformat()


def _odoo_bool(val) -> bool:
    return bool(val) and val is not False


# ── Créances clients ──────────────────────────────────────────────────────────

async def get_overdue_receivables() -> dict:
    """Retourne toutes les factures clients (out_invoice) en retard de paiement.

    Retourne :
        {
            "total_overdue": float,
            "count": int,
            "invoices": [
                {
                    "id": int, "name": str, "partner_id": int, "partner_name": str,
                    "amount_residual": float, "invoice_date_due": str,
                    "days_overdue": int, "currency": str
                }
            ]
        }
    """
    from app.infrastructure.odoo.client import OdooClient

    today = _today()
    client = OdooClient()
    domain = [
        ("move_type", "=", "out_invoice"),
        ("state", "=", "posted"),
        ("payment_state", "in", ["not_paid", "partial"]),
        ("invoice_date_due", "<", today),
    ]
    fields = [
        "id", "name", "partner_id", "amount_residual",
        "invoice_date_due", "currency_id", "invoice_date",
    ]

    records = await asyncio.to_thread(client.fetch_all, "account.move", domain, fields)

    today_dt = date.today()
    invoices = []
    total = 0.0
    for r in records:
        due_str = r.get("invoice_date_due") or ""
        try:
            due_date = date.fromisoformat(due_str)
            days_overdue = (today_dt - due_date).days
        except ValueError:
            days_overdue = 0

        partner = r.get("partner_id") or []
        currency = r.get("currency_id") or []
        amount = float(r.get("amount_residual") or 0)
        total += amount
        invoices.append({
            "id": r["id"],
            "name": r.get("name", ""),
            "partner_id": partner[0] if isinstance(partner, list) else partner,
            "partner_name": partner[1] if isinstance(partner, list) and len(partner) > 1 else "",
            "amount_residual": amount,
            "invoice_date_due": due_str,
            "days_overdue": days_overdue,
            "currency": currency[1] if isinstance(currency, list) and len(currency) > 1 else "XOF",
        })

    invoices.sort(key=lambda x: x["days_overdue"], reverse=True)
    return {"total_overdue": round(total, 2), "count": len(invoices), "invoices": invoices}


async def get_all_receivables() -> dict:
    """Retourne le total des créances clients (factures non soldées, incluant non échues)."""
    from app.infrastructure.odoo.client import OdooClient

    client = OdooClient()
    domain = [
        ("move_type", "=", "out_invoice"),
        ("state", "=", "posted"),
        ("payment_state", "in", ["not_paid", "partial"]),
    ]
    fields = ["id", "name", "partner_id", "amount_residual", "invoice_date_due", "currency_id"]
    records = await asyncio.to_thread(client.fetch_all, "account.move", domain, fields)

    total = sum(float(r.get("amount_residual") or 0) for r in records)
    return {"total_receivables": round(total, 2), "count": len(records)}


# ── Dettes fournisseurs ───────────────────────────────────────────────────────

async def get_overdue_payables() -> dict:
    """Retourne toutes les factures fournisseurs (in_invoice) en retard de paiement.

    Même structure que get_overdue_receivables mais pour les dettes.
    """
    from app.infrastructure.odoo.client import OdooClient

    today = _today()
    client = OdooClient()
    domain = [
        ("move_type", "=", "in_invoice"),
        ("state", "=", "posted"),
        ("payment_state", "in", ["not_paid", "partial"]),
        ("invoice_date_due", "<", today),
    ]
    fields = [
        "id", "name", "partner_id", "amount_residual",
        "invoice_date_due", "currency_id",
    ]
    records = await asyncio.to_thread(client.fetch_all, "account.move", domain, fields)

    today_dt = date.today()
    invoices = []
    total = 0.0
    for r in records:
        due_str = r.get("invoice_date_due") or ""
        try:
            due_date = date.fromisoformat(due_str)
            days_overdue = (today_dt - due_date).days
        except ValueError:
            days_overdue = 0

        partner = r.get("partner_id") or []
        currency = r.get("currency_id") or []
        amount = float(r.get("amount_residual") or 0)
        total += amount
        invoices.append({
            "id": r["id"],
            "name": r.get("name", ""),
            "partner_id": partner[0] if isinstance(partner, list) else partner,
            "partner_name": partner[1] if isinstance(partner, list) and len(partner) > 1 else "",
            "amount_residual": amount,
            "invoice_date_due": due_str,
            "days_overdue": days_overdue,
            "currency": currency[1] if isinstance(currency, list) and len(currency) > 1 else "XOF",
        })

    invoices.sort(key=lambda x: x["days_overdue"], reverse=True)
    return {"total_overdue": round(total, 2), "count": len(invoices), "invoices": invoices}


async def get_all_payables() -> dict:
    """Retourne le total des dettes fournisseurs (factures non soldées)."""
    from app.infrastructure.odoo.client import OdooClient

    client = OdooClient()
    domain = [
        ("move_type", "=", "in_invoice"),
        ("state", "=", "posted"),
        ("payment_state", "in", ["not_paid", "partial"]),
    ]
    fields = ["id", "amount_residual"]
    records = await asyncio.to_thread(client.fetch_all, "account.move", domain, fields)
    total = sum(float(r.get("amount_residual") or 0) for r in records)
    return {"total_payables": round(total, 2), "count": len(records)}


# ── DSO (Days Sales Outstanding) ──────────────────────────────────────────────

async def calculate_dso(period_days: int = 90) -> dict:
    """Calcule le DSO (délai moyen de recouvrement des créances).

    DSO = (Créances clients en cours / CA sur la période) × nombre de jours

    Args:
        period_days: Nombre de jours de la période de référence (défaut 90j).

    Retourne :
        {"dso_days": float, "total_receivables": float, "ca_period": float, "period_days": int}
    """
    from app.infrastructure.odoo.client import OdooClient
    from datetime import timedelta

    client = OdooClient()
    today = date.today()
    period_start = (today - timedelta(days=period_days)).isoformat()

    # Créances clients en cours
    receivables_data = await get_all_receivables()
    total_receivables = receivables_data["total_receivables"]

    # CA facturé sur la période (factures validées et payées ou non)
    ca_domain = [
        ("move_type", "=", "out_invoice"),
        ("state", "=", "posted"),
        ("invoice_date", ">=", period_start),
    ]
    ca_fields = ["amount_untaxed"]
    ca_records = await asyncio.to_thread(client.fetch_all, "account.move", ca_domain, ca_fields)
    ca_period = sum(float(r.get("amount_untaxed") or 0) for r in ca_records)

    if ca_period == 0:
        dso = 0.0
    else:
        dso = round((total_receivables / ca_period) * period_days, 1)

    return {
        "dso_days": dso,
        "total_receivables": round(total_receivables, 2),
        "ca_period": round(ca_period, 2),
        "period_days": period_days,
    }


# ── Trésorerie ────────────────────────────────────────────────────────────────

async def get_cash_position() -> dict:
    """Retourne la position de trésorerie depuis les journaux de banque/caisse Odoo.

    Retourne :
        {"total_cash": float, "accounts": [{"name": str, "balance": float}]}
    """
    from app.infrastructure.odoo.client import OdooClient

    client = OdooClient()

    # Récupérer les journaux de type bank/cash
    journal_domain = [("type", "in", ["bank", "cash"])]
    journal_fields = ["id", "name", "type"]
    journals = await asyncio.to_thread(
        client.fetch_all, "account.journal", journal_domain, journal_fields
    )

    accounts = []
    total = 0.0

    for j in journals:
        jid = j["id"]
        # Solde courant via account.account lié au journal
        balance_domain = [("journal_id", "=", jid), ("move_id.state", "=", "posted")]
        balance_fields = ["debit", "credit"]
        lines = await asyncio.to_thread(
            client.fetch_all, "account.move.line", balance_domain, balance_fields
        )
        debit = sum(float(l.get("debit") or 0) for l in lines)
        credit = sum(float(l.get("credit") or 0) for l in lines)
        balance = round(debit - credit, 2)
        total += balance
        accounts.append({"name": j.get("name", ""), "type": j.get("type", ""), "balance": balance})

    return {"total_cash": round(total, 2), "accounts": accounts}


# ── Analyse des retards par tranche ───────────────────────────────────────────

def _age_bucket(days: int) -> str:
    if days <= 30:
        return "0-30j"
    if days <= 60:
        return "31-60j"
    if days <= 90:
        return "61-90j"
    return "+90j"


async def get_aging_report() -> dict:
    """Balance âgée des créances clients groupée par tranche de retard."""
    data = await get_overdue_receivables()
    buckets: dict[str, float] = {"0-30j": 0, "31-60j": 0, "61-90j": 0, "+90j": 0}
    counts: dict[str, int] = {"0-30j": 0, "31-60j": 0, "61-90j": 0, "+90j": 0}

    for inv in data["invoices"]:
        b = _age_bucket(inv["days_overdue"])
        buckets[b] += inv["amount_residual"]
        counts[b] += 1

    return {
        "total_overdue": data["total_overdue"],
        "buckets": [
            {"label": k, "amount": round(v, 2), "count": counts[k]}
            for k, v in buckets.items()
        ],
    }


# ── Top débiteurs ─────────────────────────────────────────────────────────────

async def get_top_debtors(limit: int = 10) -> dict:
    """Retourne les N clients avec les créances en retard les plus élevées."""
    data = await get_overdue_receivables()
    by_partner: dict[int, dict] = {}

    for inv in data["invoices"]:
        pid = inv["partner_id"]
        if pid not in by_partner:
            by_partner[pid] = {
                "partner_id": pid,
                "partner_name": inv["partner_name"],
                "total_overdue": 0.0,
                "invoice_count": 0,
                "max_days_overdue": 0,
            }
        by_partner[pid]["total_overdue"] += inv["amount_residual"]
        by_partner[pid]["invoice_count"] += 1
        by_partner[pid]["max_days_overdue"] = max(
            by_partner[pid]["max_days_overdue"], inv["days_overdue"]
        )

    top = sorted(by_partner.values(), key=lambda x: x["total_overdue"], reverse=True)[:limit]
    for t in top:
        t["total_overdue"] = round(t["total_overdue"], 2)

    return {"top_debtors": top}


# ── Envoi de relance via Odoo (action exécutable) ─────────────────────────────

async def send_payment_reminder_odoo(partner_id: int, invoice_ids: list[int], message: str) -> dict:
    """Envoie un message de relance dans le chatter Odoo d'un partenaire.

    Utilisé uniquement lors de l'exécution d'une DafProposedAction approuvée.

    Retourne :
        {"success": bool, "message": str}
    """
    from app.infrastructure.odoo.client import OdooClient

    client = OdooClient()
    results = []

    for inv_id in invoice_ids:
        try:
            await asyncio.to_thread(
                client.execute,
                "account.move",
                "message_post",
                [inv_id],
                {
                    "body": message,
                    "message_type": "comment",
                    "subtype_xmlid": "mail.mt_comment",
                },
            )
            results.append({"invoice_id": inv_id, "success": True})
        except Exception as exc:
            logger.warning("daf.send_reminder.failed invoice_id=%s error=%s", inv_id, exc)
            results.append({"invoice_id": inv_id, "success": False, "error": str(exc)})

    success_count = sum(1 for r in results if r["success"])
    return {
        "success": success_count > 0,
        "message": f"{success_count}/{len(invoice_ids)} relances envoyées dans Odoo.",
        "details": results,
    }
