"""Router API pour l'agent DAF (Directeur Administratif et Financier IA).

Endpoints :
  GET  /daf/agent/status                     — état du scheduler
  POST /daf/agent/trigger                    — déclenche un cycle manuellement
  GET  /daf/runs                             — historique des cycles
  GET  /daf/runs/{run_id}                    — détail d'un cycle
  GET  /daf/snapshots/latest                 — dernier snapshot financier
  GET  /daf/snapshots                        — historique des snapshots
  GET  /daf/proposed-actions                 — liste des propositions (filtrables)
  GET  /daf/proposed-actions/{id}            — détail d'une proposition
  POST /daf/proposed-actions/{id}/approve    — approuver et exécuter
  POST /daf/proposed-actions/{id}/reject     — rejeter
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentCompany, get_current_user, require_permission
from app.api.v1.schemas.daf import (
    DafActionStatus,
    DafAgentStatusOut,
    DafProposedActionDecisionIn,
    DafProposedActionOut,
    DafRunDetailOut,
    DafRunOut,
    DafRunStatus,
    DafSnapshotOut,
    DafTriggerOut,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/daf", tags=["daf-agent"])

_read_deps = [Depends(require_permission("financial_ai:read"))]
_write_deps = [Depends(require_permission("financial_ai:write"))]


# ── Helper ORM → schema ───────────────────────────────────────────────────────

def _run_to_out(orm, proposed_count: int = 0) -> DafRunOut:
    return DafRunOut(
        id=orm.id,
        trigger=orm.trigger,
        status=DafRunStatus(orm.status),
        started_at=orm.started_at,
        ended_at=orm.ended_at,
        summary=orm.summary,
        error=orm.error,
        proposed_actions_count=proposed_count,
    )


def _snapshot_to_out(orm) -> DafSnapshotOut:
    return DafSnapshotOut(
        id=orm.id,
        period_label=orm.period_label,
        total_receivables=float(orm.total_receivables) if orm.total_receivables is not None else None,
        overdue_receivables=float(orm.overdue_receivables) if orm.overdue_receivables is not None else None,
        overdue_receivables_count=orm.overdue_receivables_count,
        total_payables=float(orm.total_payables) if orm.total_payables is not None else None,
        overdue_payables=float(orm.overdue_payables) if orm.overdue_payables is not None else None,
        overdue_payables_count=orm.overdue_payables_count,
        dso_days=orm.dso_days,
        cash_position=float(orm.cash_position) if orm.cash_position is not None else None,
        snapshot_at=orm.snapshot_at,
    )


def _action_to_out(orm) -> DafProposedActionOut:
    from app.api.v1.schemas.daf import DafActionPriority, DafActionType
    return DafProposedActionOut(
        id=orm.id,
        run_id=orm.run_id,
        action_type=DafActionType(orm.action_type),
        title=orm.title,
        description=orm.description,
        reasoning=orm.reasoning,
        target_data=orm.target_data,
        priority=DafActionPriority(orm.priority),
        status=DafActionStatus(orm.status),
        proposed_at=orm.proposed_at,
        decided_at=orm.decided_at,
        executed_at=orm.executed_at,
        decided_by=orm.decided_by,
        execution_result=orm.execution_result,
        execution_error=orm.execution_error,
    )


# ── Agent status & trigger ────────────────────────────────────────────────────

@router.get("/agent/status", dependencies=_read_deps)
async def get_agent_status(company: CurrentCompany) -> DafAgentStatusOut:
    """Retourne l'état courant du scheduler DAF et du dernier cycle."""
    from app.infrastructure.db.models.daf_agent import DafAgentRunOrm
    from app.infrastructure.scheduler.daf_scheduler import daf_scheduler

    sched_status = daf_scheduler.status()

    last_run = await DafAgentRunOrm.filter(company_id=company.id).first()
    last_run_id = None
    last_run_status = None
    last_run_at = None
    if last_run:
        last_run_id = last_run.id
        last_run_status = DafRunStatus(last_run.status)
        last_run_at = last_run.started_at

    return DafAgentStatusOut(
        scheduler_running=sched_status["running"],
        interval_hours=sched_status["interval_hours"],
        next_run_at=sched_status["next_run_at"],
        last_run_id=last_run_id,
        last_run_status=last_run_status,
        last_run_at=last_run_at,
    )


@router.post("/agent/trigger", dependencies=_write_deps, status_code=status.HTTP_202_ACCEPTED)
async def trigger_agent_cycle() -> DafTriggerOut:
    """Lance un cycle d'analyse DAF immédiatement (en arrière-plan)."""
    from app.infrastructure.scheduler.daf_scheduler import daf_scheduler

    if not daf_scheduler.status()["running"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DAF_SCHEDULER_NOT_RUNNING", "message": "L'agent DAF n'est pas démarré."},
        )
    await daf_scheduler.trigger_now()
    return DafTriggerOut()


# ── Runs ──────────────────────────────────────────────────────────────────────

@router.get("/runs", dependencies=_read_deps)
async def list_runs(company: CurrentCompany, limit: int = Query(20, ge=1, le=100)) -> list[DafRunOut]:
    """Historique des cycles d'exécution de l'agent DAF."""
    from app.infrastructure.db.models.daf_agent import DafAgentRunOrm, DafProposedActionOrm

    runs = await DafAgentRunOrm.filter(company_id=company.id).order_by("-started_at").limit(limit)
    result = []
    for r in runs:
        count = await DafProposedActionOrm.filter(run_id=r.id).count()
        result.append(_run_to_out(r, proposed_count=count))
    return result


@router.get("/runs/{run_id}", dependencies=_read_deps)
async def get_run(run_id: UUID) -> DafRunDetailOut:
    """Détail complet d'un cycle : events, snapshot financier, propositions."""
    from app.infrastructure.db.models.daf_agent import (
        DafAgentEventOrm,
        DafAgentRunOrm,
        DafFinancialSnapshotOrm,
        DafProposedActionOrm,
    )
    from app.api.v1.schemas.daf import DafEventOut, DafEventType

    run = await DafAgentRunOrm.get_or_none(id=run_id)
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Run non trouvé")

    events_orm = await DafAgentEventOrm.filter(run_id=run_id).order_by("created_at")
    snapshots_orm = await DafFinancialSnapshotOrm.filter(run_id=run_id).order_by("-snapshot_at")
    actions_orm = await DafProposedActionOrm.filter(run_id=run_id).order_by("-proposed_at")

    events = [
        DafEventOut(
            id=e.id,
            event_type=DafEventType(e.event_type),
            message=e.message,
            payload=e.payload,
            created_at=e.created_at,
        )
        for e in events_orm
    ]

    return DafRunDetailOut(
        id=run.id,
        trigger=run.trigger,
        status=DafRunStatus(run.status),
        started_at=run.started_at,
        ended_at=run.ended_at,
        summary=run.summary,
        error=run.error,
        proposed_actions_count=len(actions_orm),
        events=events,
        snapshots=[_snapshot_to_out(s) for s in snapshots_orm],
        proposed_actions=[_action_to_out(a) for a in actions_orm],
    )


# ── Snapshots financiers ──────────────────────────────────────────────────────

@router.get("/snapshots/latest", dependencies=_read_deps)
async def get_latest_snapshot(company: CurrentCompany) -> DafSnapshotOut:
    """Retourne le dernier snapshot financier calculé par l'agent."""
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    snapshot = await DafFinancialSnapshotOrm.filter(run__company_id=company.id).order_by("-snapshot_at").first()
    if not snapshot:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucun snapshot disponible. Lancez un cycle d'analyse.")
    return _snapshot_to_out(snapshot)


@router.get("/snapshots", dependencies=_read_deps)
async def list_snapshots(company: CurrentCompany, limit: int = Query(10, ge=1, le=50)) -> list[DafSnapshotOut]:
    """Historique des snapshots financiers."""
    from app.infrastructure.db.models.daf_agent import DafFinancialSnapshotOrm

    rows = await DafFinancialSnapshotOrm.filter(run__company_id=company.id).order_by("-snapshot_at").limit(limit)
    return [_snapshot_to_out(r) for r in rows]


# ── Proposed actions ──────────────────────────────────────────────────────────

@router.get("/proposed-actions", dependencies=_read_deps)
async def list_proposed_actions(
    company: CurrentCompany,
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = None,
    limit: int = Query(50, ge=1, le=200),
) -> list[DafProposedActionOut]:
    """Liste des actions proposées par l'agent, filtrables par statut et priorité."""
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    qs = DafProposedActionOrm.filter(run__company_id=company.id).order_by("-proposed_at")
    if status_filter:
        qs = qs.filter(status=status_filter)
    if priority:
        qs = qs.filter(priority=priority)
    rows = await qs.limit(limit)
    return [_action_to_out(r) for r in rows]


@router.get("/proposed-actions/{action_id}", dependencies=_read_deps)
async def get_proposed_action(action_id: UUID) -> DafProposedActionOut:
    """Détail d'une proposition d'action."""
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    action = await DafProposedActionOrm.get_or_none(id=action_id)
    if not action:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action non trouvée")
    return _action_to_out(action)


@router.post("/proposed-actions/{action_id}/approve", dependencies=_write_deps)
async def approve_action(
    action_id: UUID,
    body: DafProposedActionDecisionIn,
    current_user=Depends(get_current_user),
) -> DafProposedActionOut:
    """Approuve une proposition et déclenche son exécution immédiate."""
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    action = await DafProposedActionOrm.get_or_none(id=action_id)
    if not action:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action non trouvée")
    if action.status != "pending":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "ACTION_NOT_PENDING", "message": f"L'action est en statut '{action.status}', pas 'pending'."},
        )

    action.status = "approved"
    action.decided_at = datetime.now(timezone.utc)
    action.decided_by = current_user.id
    await action.save()

    # Exécution en arrière-plan
    import asyncio
    asyncio.create_task(_execute_action(action_id))

    return _action_to_out(action)


@router.post("/proposed-actions/{action_id}/reject", dependencies=_write_deps)
async def reject_action(
    action_id: UUID,
    body: DafProposedActionDecisionIn,
    current_user=Depends(get_current_user),
) -> DafProposedActionOut:
    """Rejette une proposition. L'action est ignorée sans exécution."""
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    action = await DafProposedActionOrm.get_or_none(id=action_id)
    if not action:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action non trouvée")
    if action.status != "pending":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={"code": "ACTION_NOT_PENDING", "message": f"L'action est en statut '{action.status}', pas 'pending'."},
        )

    action.status = "rejected"
    action.decided_at = datetime.now(timezone.utc)
    action.decided_by = current_user.id
    await action.save()

    return _action_to_out(action)


# ── Exécution des actions approuvées ─────────────────────────────────────────

async def _execute_action(action_id: UUID) -> None:
    """Exécute une action approuvée. Appelé en arrière-plan via asyncio.create_task."""
    from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

    action = await DafProposedActionOrm.get_or_none(id=action_id)
    if not action or action.status != "approved":
        return

    logger.info("daf.action.execute action_id=%s type=%s", action_id, action.action_type)

    try:
        result = await _dispatch_action(action)
        action.status = "executed"
        action.executed_at = datetime.now(timezone.utc)
        action.execution_result = result
        await action.save()
        logger.info("daf.action.executed action_id=%s", action_id)

    except Exception as exc:
        logger.exception("daf.action.failed action_id=%s", action_id)
        action.status = "failed"
        action.execution_error = str(exc)[:1000]
        await action.save()


async def _dispatch_action(action) -> dict:
    """Dispatche l'exécution selon le type d'action."""
    from app.infrastructure.ai.tools.daf_financial_tools import send_payment_reminder_odoo
    from app.services.notification_email import _get_smtp_config, _send_smtp, _base_template

    td = action.target_data or {}
    action_type = action.action_type

    if action_type == "send_reminder":
        partner_id = td.get("partner_id")
        invoice_ids = td.get("invoice_ids") or []
        partner_name = td.get("partner_name") or "client"
        amount = td.get("amount") or 0

        # Message dans le chatter Odoo
        odoo_msg = (
            f"Relance de paiement — {action.title}\n\n"
            f"Monsieur/Madame,\n\n"
            f"Nous vous contactons au sujet des factures impayées pour un montant total de "
            f"{amount:,.0f} XOF.\n\n{action.description}\n\nCordialement,\nL'équipe PortaLis"
        )
        odoo_result = await send_payment_reminder_odoo(partner_id, invoice_ids, odoo_msg)

        # Email via SMTP si possible
        smtp_sent = False
        try:
            smtp = await _get_smtp_config()
            if smtp.host and smtp.from_email and td.get("partner_email"):
                html = _base_template(
                    recipient_name=partner_name,
                    intro=f"Nous vous contactons au sujet de vos factures impayées : {action.description}",
                    rows=[
                        ("Montant total", f"{amount:,.0f} XOF"),
                        ("Référence", action.title),
                    ],
                    info_box="Veuillez régulariser votre situation dans les meilleurs délais.",
                )
                import asyncio
                await asyncio.to_thread(_send_smtp, smtp, td["partner_email"], f"[PortaLis] Relance : {action.title}", html)
                smtp_sent = True
        except Exception as exc:
            logger.warning("daf.action.send_reminder.smtp_failed error=%s", exc)

        return {**odoo_result, "smtp_sent": smtp_sent}

    # Pour les autres types d'actions : log seul (implémentation métier future)
    logger.info("daf.action.dispatch.no_executor action_type=%s action_id=%s", action_type, action.id)
    return {
        "success": True,
        "message": f"Action '{action_type}' enregistrée comme exécutée. Implémentation métier à compléter.",
    }
