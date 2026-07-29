"""Service Agent DAF — Directeur Administratif et Financier IA.

L'agent tourne en arrière-plan (APScheduler), exécute un cycle complet d'analyse
financière Odoo, propose des actions à valider par le DAF humain, et notifie.

Cycle d'un run :
  1. Créer DafAgentRunOrm (trigger=startup|scheduled|manual)
  2. Construire le LangGraph ReAct agent avec les outils financiers
  3. L'agent appelle ses outils : créances, dettes, DSO, trésorerie, balance âgée
  4. L'agent propose des actions via l'outil `propose_action` → DafProposedActionOrm
  5. L'agent finalise via `complete_analysis` → sauvegarde snapshot + summary
  6. Notification des utilisateurs financial_ai:write
  7. Clore le run (status=completed|failed)
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from langchain_core.tools import tool as lc_tool

logger = logging.getLogger(__name__)

# ── Prompt système DAF ────────────────────────────────────────────────────────

DAF_SYSTEM_PROMPT = """Tu es l'Agent DAF (Directeur Administratif et Financier) IA de PortaLis.
Tu analyses automatiquement la santé financière de l'entreprise en interrogeant l'ERP Odoo.

TON RÔLE :
- Surveiller les créances clients (factures impayées, retards)
- Surveiller les dettes fournisseurs (factures à payer, retards)
- Calculer le DSO (Days Sales Outstanding) et alerter si dégradé
- Analyser la trésorerie disponible
- Identifier les clients à relancer (top débiteurs, retards critiques)
- Proposer des actions concrètes et priorisées

WORKFLOW OBLIGATOIRE (appelle les outils dans cet ordre) :
1. `fetch_overdue_receivables` — créances en retard
2. `fetch_all_receivables` — total créances
3. `fetch_overdue_payables` — dettes fournisseurs en retard
4. `fetch_all_payables` — total dettes
5. `calculate_dso` — DSO 90 jours
6. `fetch_cash_position` — trésorerie
7. `fetch_aging_report` — balance âgée des créances
8. `fetch_top_debtors` — top débiteurs

Après l'analyse, pour CHAQUE problème identifié, appelle `propose_action`.
IMPORTANT : quand tu proposes une action pour un partenaire ou des factures spécifiques,
renseigne TOUS les champs disponibles depuis les données récupérées :
- partner_name, partner_email, partner_phone (si présents dans les données)
- invoice_numbers : les références lisibles (ex: ["FAC/2026/00001", "FAC/2026/00003"])
- invoice_due_dates : les dates d'échéance (ex: ["2026-06-30"])
- invoice_days_overdue : les jours de retard par facture (ex: [7, 15])
- amount : le total restant à payer
- currency : la devise (XOF, EUR…)
Enfin, appelle `complete_analysis` avec le résumé complet de ta session.

SEUILS D'ALERTE :
- Retard > 30j + montant > 500 000 XOF → priorité HIGH
- Retard > 60j → priorité HIGH, suggère relance formelle
- Retard > 90j → priorité CRITICAL, suggère contentieux ou plan de paiement
- DSO > 45j → alerte, propose revue de la politique crédit
- Trésorerie < 200 000 → alerte CRITICAL

TYPES D'ACTIONS POSSIBLES :
- "send_reminder" : relance email au client
- "escalate_debt" : escalade interne ou mise en contentieux
- "flag_account" : marquer un compte comme à risque
- "contact_supplier" : contacter un fournisseur pour report d'échéance
- "payment_plan" : proposer un plan de paiement à un client
- "review_credit_policy" : revue de la politique crédit
- "other" : autre action

RÈGLES :
- Sois factuel, chiffré, professionnel
- Chaque proposition doit avoir un raisonnement clair basé sur les données
- Ne propose pas la même action deux fois pour le même partenaire
- Priorise les montants les plus élevés et les retards les plus longs
- Réponds TOUJOURS en français

Lance l'analyse maintenant."""


# ── Contexte de run (passé aux outils via closure) ───────────────────────────

class _RunContext:
    """Contexte partagé entre les outils du cycle courant."""

    def __init__(self, run_id: UUID):
        self.run_id = run_id
        self.snapshot_data: dict = {}
        self.proposed_actions: list[dict] = []
        self.events: list[dict] = []
        self.summary: str = ""

    def log_event(self, event_type: str, message: str, payload: dict | None = None):
        self.events.append({"event_type": event_type, "message": message, "payload": payload})


# ── Factory d'outils pour un cycle donné ─────────────────────────────────────

def _build_tools_for_run(ctx: _RunContext) -> list:
    """Construit les outils LangChain pour ce cycle d'exécution."""
    from app.infrastructure.ai.tools.daf_financial_tools import (
        calculate_dso as _calculate_dso,
        get_aging_report as _get_aging_report,
        get_all_payables as _get_all_payables,
        get_all_receivables as _get_all_receivables,
        get_cash_position as _get_cash_position,
        get_overdue_payables as _get_overdue_payables,
        get_overdue_receivables as _get_overdue_receivables,
        get_top_debtors as _get_top_debtors,
    )

    @lc_tool
    async def fetch_overdue_receivables() -> str:
        """Récupère toutes les factures clients en retard de paiement depuis Odoo."""
        data = await _get_overdue_receivables()
        ctx.snapshot_data["overdue_receivables"] = data["total_overdue"]
        ctx.snapshot_data["overdue_receivables_count"] = data["count"]
        ctx.snapshot_data["overdue_receivables_detail"] = data["invoices"]
        ctx.log_event("analysis", f"Créances en retard : {data['total_overdue']:,.0f} XOF ({data['count']} factures)", data)
        return str(data)

    @lc_tool
    async def fetch_all_receivables() -> str:
        """Récupère le total des créances clients (toutes factures non soldées)."""
        data = await _get_all_receivables()
        ctx.snapshot_data["total_receivables"] = data["total_receivables"]
        ctx.log_event("analysis", f"Total créances : {data['total_receivables']:,.0f} XOF ({data['count']} factures)")
        return str(data)

    @lc_tool
    async def fetch_overdue_payables() -> str:
        """Récupère toutes les factures fournisseurs en retard de paiement depuis Odoo."""
        data = await _get_overdue_payables()
        ctx.snapshot_data["overdue_payables"] = data["total_overdue"]
        ctx.snapshot_data["overdue_payables_count"] = data["count"]
        ctx.snapshot_data["overdue_payables_detail"] = data["invoices"]
        ctx.log_event("analysis", f"Dettes en retard : {data['total_overdue']:,.0f} XOF ({data['count']} factures)", data)
        return str(data)

    @lc_tool
    async def fetch_all_payables() -> str:
        """Récupère le total des dettes fournisseurs (toutes factures non soldées)."""
        data = await _get_all_payables()
        ctx.snapshot_data["total_payables"] = data["total_payables"]
        ctx.log_event("analysis", f"Total dettes : {data['total_payables']:,.0f} XOF ({data['count']} factures)")
        return str(data)

    @lc_tool
    async def calculate_dso_tool() -> str:
        """Calcule le DSO (Days Sales Outstanding) sur 90 jours."""
        data = await _calculate_dso(period_days=90)
        ctx.snapshot_data["dso_days"] = data["dso_days"]
        ctx.log_event("analysis", f"DSO : {data['dso_days']} jours (CA 90j : {data['ca_period']:,.0f} XOF)", data)
        return str(data)

    @lc_tool
    async def fetch_cash_position() -> str:
        """Récupère la position de trésorerie depuis les journaux bancaires Odoo."""
        data = await _get_cash_position()
        ctx.snapshot_data["cash_position"] = data["total_cash"]
        ctx.log_event(
            "analysis" if data["total_cash"] >= 0 else "alert",
            f"Trésorerie : {data['total_cash']:,.0f} XOF",
            data,
        )
        return str(data)

    @lc_tool
    async def fetch_aging_report() -> str:
        """Génère la balance âgée des créances clients par tranche de retard."""
        data = await _get_aging_report()
        ctx.snapshot_data["aging_report"] = data
        ctx.log_event("analysis", f"Balance âgée calculée. Total retards : {data['total_overdue']:,.0f} XOF", data)
        return str(data)

    @lc_tool
    async def fetch_top_debtors() -> str:
        """Retourne les 10 clients avec les créances en retard les plus élevées."""
        data = await _get_top_debtors(limit=10)
        ctx.snapshot_data["top_debtors"] = data["top_debtors"]
        ctx.log_event("analysis", f"Top débiteurs identifiés : {len(data['top_debtors'])} clients", data)
        return str(data)

    @lc_tool
    async def propose_action(
        action_type: str,
        title: str,
        description: str,
        reasoning: str,
        priority: str = "medium",
        partner_id: int | None = None,
        partner_name: str | None = None,
        partner_email: str | None = None,
        partner_phone: str | None = None,
        invoices: list[dict] | None = None,
        total_amount: float | None = None,
        currency: str | None = None,
    ) -> str:
        """Propose une action à valider par le DAF humain.

        Args:
            action_type: Type d'action (send_reminder|escalate_debt|flag_account|
                         contact_supplier|payment_plan|review_credit_policy|other)
            title: Titre court de la proposition
            description: Description détaillée de l'action à effectuer
            reasoning: Raisonnement de l'agent (pourquoi cette action est nécessaire)
            priority: low|medium|high|critical
            partner_id: ID Odoo interne du partenaire
            partner_name: Nom complet du partenaire (entreprise ou personne)
            partner_email: Email du partenaire si disponible
            partner_phone: Téléphone du partenaire si disponible
            invoices: Liste des factures concernées. Chaque élément est un objet avec :
                      id (int), number (str ex: "FAC/2026/00001"), due_date (str "YYYY-MM-DD"),
                      days_overdue (int), amount (float)
                      Exemple : [{"id": 1, "number": "FAC/2026/00001",
                                  "due_date": "2026-07-02", "days_overdue": 7,
                                  "amount": 1717200}]
            total_amount: Montant total concerné (somme des restes à payer)
            currency: Devise (ex: "XOF", "EUR")
        """
        from app.infrastructure.db.models.daf_agent import DafProposedActionOrm

        # Clé de déduplication basée sur les IDs techniques des factures
        normalized_invoice_ids = sorted({inv["id"] for inv in (invoices or []) if inv.get("id")})

        # Clé de déduplication :
        # - Avec partner_id  → (action_type, partner_id, invoice_ids)
        # - Sans partner_id  → (action_type) : alertes structurelles (DSO, trésorerie)
        active_statuses = ["pending", "approved"]

        if partner_id is not None:
            candidates = await DafProposedActionOrm.filter(
                action_type=action_type,
                status__in=active_statuses,
            )
            duplicate = any(
                (c.target_data or {}).get("partner_id") == partner_id
                and sorted(
                    inv["id"] for inv in (c.target_data or {}).get("invoices") or []
                    if inv.get("id")
                ) == normalized_invoice_ids
                for c in candidates
            )
        else:
            # Alerte structurelle : une seule entrée active par type suffit
            candidates = await DafProposedActionOrm.filter(
                action_type=action_type,
                status__in=active_statuses,
            )
            duplicate = any(
                (c.target_data or {}).get("partner_id") is None
                for c in candidates
            )

        if duplicate:
            ctx.log_event(
                "info",
                f"Action '{action_type}' déjà en attente "
                f"(partner_id={partner_id}) — ignorée.",
            )
            return (
                f"Action '{action_type}' ignorée : une proposition identique est déjà "
                f"en attente de validation par le DAF."
            )

        action = {
            "action_type": action_type,
            "title": title,
            "description": description,
            "reasoning": reasoning,
            "priority": priority,
            "target_data": {
                "partner_id": partner_id,
                "partner_name": partner_name,
                "partner_email": partner_email,
                "partner_phone": partner_phone,
                "invoices": invoices or [],
                "total_amount": total_amount,
                "currency": currency or "XOF",
            },
        }
        ctx.proposed_actions.append(action)
        ctx.log_event(
            "alert" if priority in ("high", "critical") else "info",
            f"[{priority.upper()}] Action proposée : {title}",
            action,
        )
        return f"Action '{title}' enregistrée (priorité: {priority})."

    @lc_tool
    async def complete_analysis(summary: str) -> str:
        """Finalise le cycle d'analyse avec un résumé complet.

        Args:
            summary: Résumé markdown de l'analyse : chiffres clés, alertes principales,
                     nombre de propositions générées, recommandations globales.
        """
        ctx.summary = summary
        ctx.log_event("info", "Analyse terminée.", {"summary_length": len(summary)})
        return "Cycle d'analyse terminé et enregistré."

    return [
        fetch_overdue_receivables,
        fetch_all_receivables,
        fetch_overdue_payables,
        fetch_all_payables,
        calculate_dso_tool,
        fetch_cash_position,
        fetch_aging_report,
        fetch_top_debtors,
        propose_action,
        complete_analysis,
    ]


# ── Persistance des résultats ─────────────────────────────────────────────────

async def _persist_run_results(run_id: UUID, ctx: _RunContext) -> None:
    """Sauvegarde events, snapshot et proposed_actions en base."""
    from datetime import date

    from app.infrastructure.db.models.daf_agent import (
        DafAgentEventOrm,
        DafAgentRunOrm,
        DafFinancialSnapshotOrm,
        DafProposedActionOrm,
    )

    run = await DafAgentRunOrm.get_or_none(id=run_id)
    if run is None:
        return

    # Events
    for ev in ctx.events:
        await DafAgentEventOrm.create(
            id=uuid4(),
            run_id=run_id,
            event_type=ev["event_type"],
            message=ev["message"],
            payload=ev.get("payload"),
        )

    # Snapshot financier
    sd = ctx.snapshot_data
    period_label = date.today().strftime("%Y-%m")
    await DafFinancialSnapshotOrm.create(
        id=uuid4(),
        run_id=run_id,
        period_label=period_label,
        total_receivables=sd.get("total_receivables"),
        overdue_receivables=sd.get("overdue_receivables"),
        overdue_receivables_count=sd.get("overdue_receivables_count"),
        total_payables=sd.get("total_payables"),
        overdue_payables=sd.get("overdue_payables"),
        overdue_payables_count=sd.get("overdue_payables_count"),
        dso_days=sd.get("dso_days"),
        cash_position=sd.get("cash_position"),
        raw_data=sd,
    )

    # Proposed actions
    for pa in ctx.proposed_actions:
        await DafProposedActionOrm.create(
            id=uuid4(),
            run_id=run_id,
            action_type=pa["action_type"],
            title=pa["title"],
            description=pa["description"],
            reasoning=pa["reasoning"],
            priority=pa.get("priority", "medium"),
            target_data=pa.get("target_data"),
            status="pending",
        )


# ── Notification des utilisateurs financial_ai:write ─────────────────────────

async def _notify_daf_users(
    run_id: UUID,
    summary: str,
    proposed_count: int,
    trigger: str,
) -> None:
    """Notifie par email tous les utilisateurs avec la permission financial_ai:write."""
    try:
        from app.infrastructure.auth.keycloak import KeycloakAdminClient
        from app.services.notification_email import _get_smtp_config, _send_smtp, _base_template

        kc = KeycloakAdminClient()
        users = await kc.get_users_by_role("financial_ai:write")
        if not users:
            logger.info("daf.notify.no_financial_ai_users")
            return

        trigger_label = {"startup": "démarrage", "scheduled": "cycle planifié", "manual": "déclenchement manuel"}.get(trigger, trigger)

        # Notification in-app (badge + push + WS) — indépendant de l'email
        try:
            from app.services.notification import NotificationService
            user_ids_notif = [UUID(u["id"]) for u in users if u.get("id")]
            if user_ids_notif:
                await NotificationService.create_for_users(
                    user_ids=user_ids_notif,
                    notification_type="daf_cycle_done",
                    title=f"Analyse DAF terminée — {proposed_count} action(s) proposée(s)",
                    body=(summary[:300] + "...") if len(summary or "") > 300 else (summary or ""),
                    reference_type="daf_run",
                    reference_id=run_id,
                    data={"trigger": trigger, "proposed_count": proposed_count},
                )
        except Exception as exc:
            logger.warning("daf.notify.inapp_failed run_id=%s error=%s", run_id, exc)

        smtp = await _get_smtp_config()
        if not smtp.host or not smtp.from_email:
            logger.warning("daf.notify.smtp_not_configured")
            return

        for user in users:
            email = user.get("email")
            first_name = user.get("firstName") or "DAF"
            if not email:
                continue
            subject = f"[PortaLis DAF] Analyse financière terminée — {proposed_count} action(s) proposée(s)"
            html = _base_template(
                recipient_name=first_name,
                intro=f"L'agent DAF IA a terminé son cycle d'analyse ({trigger_label}). "
                      f"{proposed_count} action(s) sont en attente de votre validation.",
                rows=[
                    ("Cycle", str(run_id)[:8] + "..."),
                    ("Actions proposées", str(proposed_count)),
                    ("Déclencheur", trigger_label),
                ],
                cta_label="Consulter les propositions" if proposed_count > 0 else None,
                cta_url="#",
                info_box=summary[:300] + "..." if len(summary) > 300 else summary or None,
            )
            try:
                await asyncio.to_thread(_send_smtp, smtp, email, subject, html)
                logger.info("daf.notify.sent to=%s", email)
            except Exception as exc:
                logger.warning("daf.notify.send_failed email=%s error=%s", email, exc)

    except Exception as exc:
        logger.warning("daf.notify.failed run_id=%s error=%s", run_id, exc)


async def _notify_daf_status(event: str, trigger: str | None = None) -> None:
    """Notifie le démarrage ou l'arrêt de l'agent."""
    try:
        from app.infrastructure.auth.keycloak import KeycloakAdminClient
        from app.services.notification_email import _get_smtp_config, _send_smtp, _base_template

        kc = KeycloakAdminClient()
        users = await kc.get_users_by_role("financial_ai:write")
        if not users:
            return

        if event == "started":
            subject = "[PortaLis DAF] Agent DAF IA démarré"
            intro = "L'agent DAF IA vient de démarrer. Il analysera les données financières toutes les 3 heures."
            rows = [("Déclencheur", trigger or "inconnu"), ("Fréquence", "Toutes les 3 heures")]
            notif_type = "daf_started"
        else:
            subject = "[PortaLis DAF] Agent DAF IA arrêté"
            intro = "L'agent DAF IA a été arrêté. Les analyses automatiques sont suspendues."
            rows = [("Statut", "Arrêté")]
            notif_type = "daf_stopped"

        # Notification in-app
        try:
            from app.services.notification import NotificationService
            user_ids_notif = [UUID(u["id"]) for u in users if u.get("id")]
            if user_ids_notif:
                await NotificationService.create_for_users(
                    user_ids=user_ids_notif,
                    notification_type=notif_type,
                    title=subject.replace("[PortaLis DAF] ", ""),
                    body=intro,
                )
        except Exception as exc_notif:
            logger.warning("daf.notify_status.inapp_failed event=%s error=%s", event, exc_notif)

        smtp = await _get_smtp_config()
        if not smtp.host or not smtp.from_email:
            return

        for user in users:
            email = user.get("email")
            first_name = user.get("firstName") or "DAF"
            if not email:
                continue
            html = _base_template(recipient_name=first_name, intro=intro, rows=rows)
            try:
                await asyncio.to_thread(_send_smtp, smtp, email, subject, html)
            except Exception:
                pass

    except Exception as exc:
        logger.warning("daf.notify_status.failed event=%s error=%s", event, exc)


# ── Cœur du cycle ────────────────────────────────────────────────────────────

async def run_daf_cycle(
    trigger: str = "scheduled",
    company_id=None,
    erp_id: int | None = None,
) -> UUID:
    """Exécute un cycle complet d'analyse DAF. Retourne l'ID du run.

    Args:
        trigger: "startup" | "scheduled" | "manual"
        company_id: UUID de l'entreprise PortaLis
        erp_id: ID Odoo de l'entreprise (res.company.id)
    """
    from app.infrastructure.ai.agent import _get_llm
    from app.infrastructure.ai.tools.daf_financial_tools import set_company_context
    from app.infrastructure.db.models.daf_agent import DafAgentRunOrm
    from app.infrastructure.db.repositories.ai_config import AiConfigRepository
    from langgraph.prebuilt import create_react_agent

    set_company_context(erp_id)

    run_id = uuid4()
    run = await DafAgentRunOrm.create(
        id=run_id,
        trigger=trigger,
        status="running",
        company_id=company_id,
    )

    logger.info("daf.cycle.start run_id=%s trigger=%s", run_id, trigger)

    ctx = _RunContext(run_id=run_id)
    ctx.log_event("agent_start", f"Cycle DAF démarré (trigger={trigger})")

    try:
        # Modèle par défaut depuis la config applicative
        _, model_domain, _ = await AiConfigRepository().get()
        llm = await _get_llm(model_domain.provider, model_domain.name, context="daf")

        tools = _build_tools_for_run(ctx)
        agent = create_react_agent(model=llm, tools=tools, prompt=DAF_SYSTEM_PROMPT)

        await agent.ainvoke({"messages": [("human", "Démarre l'analyse financière complète.")]})

        # Persistance
        await _persist_run_results(run_id, ctx)

        # Finalisation du run
        run.status = "completed"
        run.summary = ctx.summary
        run.ended_at = datetime.now(timezone.utc)
        await run.save()

        logger.info(
            "daf.cycle.completed run_id=%s proposed=%d",
            run_id, len(ctx.proposed_actions),
        )

        # Notification
        await _notify_daf_users(
            run_id=run_id,
            summary=ctx.summary,
            proposed_count=len(ctx.proposed_actions),
            trigger=trigger,
        )

    except Exception as exc:
        logger.exception("daf.cycle.failed run_id=%s", run_id)
        ctx.log_event("error", f"Erreur fatale : {exc}")
        try:
            await _persist_run_results(run_id, ctx)
            run.status = "failed"
            run.error = str(exc)[:1000]
            run.ended_at = datetime.now(timezone.utc)
            await run.save()
        except Exception:
            logger.exception("daf.cycle.persist_error_failed run_id=%s", run_id)

    return run_id
