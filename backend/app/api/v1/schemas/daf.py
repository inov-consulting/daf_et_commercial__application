"""Schémas Pydantic pour l'agent DAF."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class DafRunStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class DafEventType(str, Enum):
    ANALYSIS = "analysis"
    ALERT = "alert"
    INFO = "info"
    REMINDER_SENT = "reminder_sent"
    ERROR = "error"
    AGENT_START = "agent_start"
    AGENT_STOP = "agent_stop"


class DafActionType(str, Enum):
    SEND_REMINDER = "send_reminder"
    ESCALATE_DEBT = "escalate_debt"
    FLAG_ACCOUNT = "flag_account"
    CONTACT_SUPPLIER = "contact_supplier"
    PAYMENT_PLAN = "payment_plan"
    REVIEW_CREDIT_POLICY = "review_credit_policy"
    OTHER = "other"


class DafActionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"
    FAILED = "failed"


class DafActionPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── Agent status ──────────────────────────────────────────────────────────────

class DafAgentStatusOut(BaseModel):
    """État courant du scheduler DAF."""

    scheduler_running: bool
    interval_hours: int
    next_run_at: str | None = None
    last_run_id: UUID | None = None
    last_run_status: DafRunStatus | None = None
    last_run_at: datetime | None = None


# ── Runs ──────────────────────────────────────────────────────────────────────

class DafRunOut(BaseModel):
    id: UUID
    trigger: str
    status: DafRunStatus
    started_at: datetime
    ended_at: datetime | None = None
    summary: str | None = None
    error: str | None = None
    proposed_actions_count: int = 0


class DafRunDetailOut(DafRunOut):
    events: list[DafEventOut] = []
    snapshots: list[DafSnapshotOut] = []
    proposed_actions: list[DafProposedActionOut] = []


# ── Events ────────────────────────────────────────────────────────────────────

class DafEventOut(BaseModel):
    id: UUID
    event_type: DafEventType
    message: str
    payload: dict | None = None
    created_at: datetime


# ── Snapshots financiers ──────────────────────────────────────────────────────

class DafSnapshotOut(BaseModel):
    id: UUID
    period_label: str
    total_receivables: float | None = None
    overdue_receivables: float | None = None
    overdue_receivables_count: int | None = None
    total_payables: float | None = None
    overdue_payables: float | None = None
    overdue_payables_count: int | None = None
    dso_days: float | None = None
    cash_position: float | None = None
    snapshot_at: datetime


# ── Proposed actions ──────────────────────────────────────────────────────────

class DafProposedActionOut(BaseModel):
    id: UUID
    run_id: UUID
    action_type: DafActionType
    title: str
    description: str
    reasoning: str
    target_data: dict | None = None
    priority: DafActionPriority
    status: DafActionStatus
    proposed_at: datetime
    decided_at: datetime | None = None
    executed_at: datetime | None = None
    decided_by: UUID | None = None
    execution_result: dict | None = None
    execution_error: str | None = None


class DafProposedActionDecisionIn(BaseModel):
    """Corps de la requête approve/reject."""
    comment: str | None = Field(None, description="Commentaire optionnel du DAF")


class DafTriggerOut(BaseModel):
    """Réponse au déclenchement manuel d'un cycle."""
    message: str = "Cycle DAF lancé en arrière-plan."
    trigger: str = "manual"
