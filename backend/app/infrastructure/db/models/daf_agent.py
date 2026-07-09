"""Modèles ORM pour l'agent DAF (Directeur Administratif et Financier IA).

Tables :
- daf_agent_runs         : chaque cycle d'exécution de l'agent
- daf_agent_events       : log granulaire des actions par cycle
- daf_financial_snapshots: données financières calculées à chaque cycle
- daf_proposed_actions   : propositions d'actions soumises à validation humaine
"""

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class DafAgentRunOrm(BaseModel):
    """Représente un cycle d'exécution de l'agent DAF."""

    trigger = fields.CharField(max_length=20)
    # "startup" | "scheduled" | "manual"

    status = fields.CharField(max_length=20, default="running")
    # "running" | "completed" | "failed" | "stopped"

    started_at = fields.DatetimeField(auto_now_add=True)
    ended_at = fields.DatetimeField(null=True)

    summary = fields.TextField(null=True)
    # Résumé textuel produit par l'agent à la fin du cycle

    error = fields.TextField(null=True)
    # Message d'erreur si status=failed

    class Meta:
        table = "daf_agent_runs"
        ordering = ["-started_at"]


class DafAgentEventOrm(BaseModel):
    """Log granulaire d'un événement au sein d'un cycle."""

    run: fields.ForeignKeyRelation[DafAgentRunOrm] = fields.ForeignKeyField(
        "models.DafAgentRunOrm", related_name="events", on_delete=fields.CASCADE
    )

    event_type = fields.CharField(max_length=30)
    # "analysis" | "alert" | "info" | "reminder_sent" | "error" | "agent_start" | "agent_stop"

    message = fields.TextField()
    payload = fields.JSONField(null=True)
    # Données structurées associées à l'événement (montants, IDs, etc.)

    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "daf_agent_events"
        ordering = ["-created_at"]


class DafFinancialSnapshotOrm(BaseModel):
    """Photographie des indicateurs financiers calculés lors d'un cycle."""

    run: fields.ForeignKeyRelation[DafAgentRunOrm] = fields.ForeignKeyField(
        "models.DafAgentRunOrm", related_name="snapshots", on_delete=fields.CASCADE
    )

    period_label = fields.CharField(max_length=50)
    # Ex : "2026-07" ou "S1-2026"

    # Créances clients
    total_receivables = fields.DecimalField(max_digits=18, decimal_places=2, null=True)
    overdue_receivables = fields.DecimalField(max_digits=18, decimal_places=2, null=True)
    overdue_receivables_count = fields.IntField(null=True)

    # Dettes fournisseurs
    total_payables = fields.DecimalField(max_digits=18, decimal_places=2, null=True)
    overdue_payables = fields.DecimalField(max_digits=18, decimal_places=2, null=True)
    overdue_payables_count = fields.IntField(null=True)

    # DSO (Days Sales Outstanding)
    dso_days = fields.FloatField(null=True)

    # Trésorerie
    cash_position = fields.DecimalField(max_digits=18, decimal_places=2, null=True)

    # Données brutes complètes retournées par l'agent
    raw_data = fields.JSONField(null=True)

    snapshot_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "daf_financial_snapshots"
        ordering = ["-snapshot_at"]


class DafProposedActionOrm(BaseModel):
    """Proposition d'action générée par l'agent, soumise à validation humaine."""

    run: fields.ForeignKeyRelation[DafAgentRunOrm] = fields.ForeignKeyField(
        "models.DafAgentRunOrm", related_name="proposed_actions", on_delete=fields.CASCADE
    )

    action_type = fields.CharField(max_length=50)
    # "send_reminder" | "escalate_debt" | "flag_account" | "contact_supplier"
    # | "payment_plan" | "legal_action" | "other"

    title = fields.CharField(max_length=255)
    description = fields.TextField()
    reasoning = fields.TextField()
    # Raisonnement de l'agent : pourquoi cette action est recommandée

    target_data = fields.JSONField(null=True)
    # Données cibles : partner_id, invoice_ids, amounts, etc.

    priority = fields.CharField(max_length=10, default="medium")
    # "low" | "medium" | "high" | "critical"

    status = fields.CharField(max_length=20, default="pending")
    # "pending" | "approved" | "rejected" | "executed" | "failed"

    proposed_at = fields.DatetimeField(auto_now_add=True)
    decided_at = fields.DatetimeField(null=True)
    executed_at = fields.DatetimeField(null=True)

    decided_by = fields.UUIDField(null=True)
    # UUID de l'utilisateur qui a approuvé ou rejeté

    execution_result = fields.JSONField(null=True)
    # Résultat de l'exécution (réponse Odoo, email envoyé, etc.)

    execution_error = fields.TextField(null=True)

    class Meta:
        table = "daf_proposed_actions"
        ordering = ["-proposed_at"]
