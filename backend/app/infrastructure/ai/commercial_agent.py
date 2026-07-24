"""Agent Commercial IA — enrichissement et prédiction commerciale.

Flux par client :
  1. list_clients_to_enrich       → récupère les clients Odoo à traiter
  2. search_company_web           → recherche internet
  3. save_company_insight         → écrit le HTML enrichi dans Odoo
  4. get_client_commercial_history → lit l'historique transport + dossiers Odoo
  5. save_commercial_prediction   → sauvegarde la prédiction dans Portalis DB
"""
from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import uuid4

import httpx
from langchain_core.tools import tool as lc_tool
from langgraph.prebuilt import create_react_agent

from app.core.config import settings
from app.infrastructure.ai.agent import _get_llm
from app.infrastructure.db.repositories.ai_config import AiConfigRepository

logger = logging.getLogger(__name__)

# ── Prompt système ────────────────────────────────────────────────────────────

COMMERCIAL_AGENT_PROMPT = """Tu es un agent commercial IA pour PortaLis (INOV Consulting).
Tu as deux missions pour chaque client : enrichir sa fiche et prédire la prochaine opportunité commerciale.

WORKFLOW OBLIGATOIRE — exécute chaque étape dans l'ordre exact :

ÉTAPE 1 — LISTER
  Appelle `list_clients_to_enrich` pour obtenir la liste des clients à traiter.
  Si la liste est vide, réponds "Aucun client à traiter." et termine.

ÉTAPE 2 — POUR CHAQUE CLIENT (un par un, dans l'ordre) :

  A. ENRICHISSEMENT WEB
     a. Appelle `search_company_web` avec le nom, pays, ville (et site web si dispo).
     b. Rédige un HTML avec ces sections (omets celles sans info) :
          <h4>Secteur d'activité</h4><p>...</p>
          <h4>Informations financières</h4><p>...</p>
          <h4>Présence géographique et marchés</h4><ul><li>...</li></ul>
          <h4>Actualités récentes</h4><p>...</p>
     c. Appelle `save_company_insight` avec l'ID client et le HTML.
        Si rien trouvé → status="error", html="".

  B. PRÉDICTION COMMERCIALE
     a. Appelle `get_client_commercial_history` avec l'ID du client.
     b. Analyse l'historique (transport passé + dossiers Odoo) ET les infos web.
        Identifie :
        - Le schéma de besoins (fréquence, saison, type de transport)
        - Le potentiel non exploité (nouvelles routes, volumes plus importants)
        - Le moment optimal pour proposer
     c. Construis une prédiction avec :
        - prediction_summary : analyse complète en Markdown (causes, tendances, raisonnement)
        - suggested_action   : action précise pour le commercial (ex: "Proposer contrat annuel
          maritime Douala→Rotterdam avant septembre, volume estimé 3 expéditions/trimestre")
        - opportunity_type   : "renouvellement" | "upsell" | "nouveau_besoin" | "opportunite"
        - confidence_score   : entre 0.0 (spéculatif) et 1.0 (quasi-certain), ex: 0.75
        - predicted_revenue  : CA estimé en devise locale (null si impossible à estimer)
     d. Appelle `save_commercial_prediction` avec ces données.

ÉTAPE 3 — RÉCAPITULATIF
  "✅ X clients enrichis | 🔮 X prédictions créées | ⚠️ Y erreurs"

RÈGLES ABSOLUES :
- Ne jamais inventer de faits non trouvés dans les données ou sur internet.
- HTML uniquement : <h4>, <p>, <ul>, <li> — pas de <table>, pas de style inline.
- Traite les clients UN PAR UN dans l'ordre reçu.
- Ne t'arrête pas avant d'avoir traité TOUS les clients de la liste.
- Réponds toujours en français.
- Messages intermédiaires concis : "🔍 Analyse de Acme Corp...", "💾 Prédiction sauvegardée."."""

# ── Helper Odoo ───────────────────────────────────────────────────────────────


async def _odoo_execute(model: str, method: str, args: list, kwargs: dict | None = None) -> object:
    """Appel XML-RPC Odoo dans un thread (synchrone → async)."""
    from app.infrastructure.odoo.client import OdooClient
    client = OdooClient()
    return await asyncio.to_thread(client.execute, model, method, args, kwargs or {})


# ── Tool 1 : list_clients_to_enrich ──────────────────────────────────────────


async def list_clients_to_enrich(limit: int = 20) -> str:
    """Liste les clients Odoo à enrichir, en priorisant les moins récemment traités.

    Stratégie : clients jamais enrichis d'abord (ai_insight_last_update null),
    puis les plus anciennement mis à jour — garantit que le scheduler tourne
    de façon utile même après un premier cycle complet.

    Args:
        limit: Nombre maximum de clients à retourner.
    """
    try:
        partners: list[dict] = await _odoo_execute(  # type: ignore[assignment]
            "res.partner",
            "search_read",
            [[
                ["is_company", "=", True],
                ["customer_rank", ">", 0],
            ]],
            {
                "fields": [
                    "id", "name", "country_id", "city", "website",
                    "vat", "ai_insight_status", "ai_insight_last_update",
                ],
                "limit": limit,
                "order": "ai_insight_last_update asc",
            },
        )
    except Exception as exc:
        logger.error("commercial_agent.list_clients.failed: %s", exc)
        return f"Erreur lors de la récupération des clients Odoo : {exc}"

    if not partners:
        return "Aucun client trouvé (aucune entreprise avec customer_rank > 0 dans Odoo)."

    lines = [f"## {len(partners)} client(s) à traiter\n"]
    for p in partners:
        country = p.get("country_id")
        country_name = country[1] if isinstance(country, list | tuple) else str(country or "")
        city = p.get("city") or ""
        website = p.get("website") or ""
        vat = p.get("vat") or ""
        last_update = p.get("ai_insight_last_update") or "jamais"
        lines.append(
            f"- ID={p['id']} | {p['name']} | {country_name} | {city}"
            + (f" | site: {website}" if website else "")
            + (f" | TVA: {vat}" if vat else "")
            + f" | dernier enrichissement: {last_update}"
        )

    return "\n".join(lines)


# ── Tool 2 : search_company_web ───────────────────────────────────────────────


async def search_company_web(
    company_name: str,
    country: str | None = None,
    city: str | None = None,
    website: str | None = None,
) -> str:
    """Recherche des informations publiques sur une entreprise sur internet.

    Args:
        company_name: Nom de l'entreprise (obligatoire).
        country: Pays de l'entreprise.
        city: Ville de l'entreprise.
        website: Site internet de l'entreprise (si connu).
    """
    query_parts = [company_name]
    if city:
        query_parts.append(city)
    if country:
        query_parts.append(country)
    query_parts.append("entreprise secteur activité")
    query = " ".join(query_parts)

    if settings.tavily_api_key:
        return await _search_tavily(query, company_name, website)
    return await _search_duckduckgo(query, company_name, website)


async def _search_tavily(query: str, company_name: str, website: str | None) -> str:
    payload: dict = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": "advanced",
        "max_results": 5,
        "include_answer": True,
    }
    if website:
        domain = website.replace("https://", "").replace("http://", "").split("/")[0]
        payload["include_domains"] = [domain]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post("https://api.tavily.com/search", json=payload)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("commercial_agent.tavily.failed company=%s: %s", company_name, exc)
        return await _search_duckduckgo(query, company_name, website)

    parts: list[str] = []
    if data.get("answer"):
        parts.append(f"Synthèse : {data['answer']}")
    for r in data.get("results", [])[:4]:
        content = r.get("content", "")[:400]
        if content:
            parts.append(f"[{r.get('title', '')}] {content} (source: {r.get('url', '')})")

    return "\n\n".join(parts) if parts else f"Aucune information trouvée pour {company_name}."


async def _search_duckduckgo(query: str, company_name: str, website: str | None) -> str:
    results: list[str] = []

    # 1. DuckDuckGo Instant Answer (Wikipedia/Wikidata — fonctionne surtout pour les grandes entreprises)
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"},
                headers={"User-Agent": "Mozilla/5.0 PortaLis-CommercialAgent/1.0"},
            )
            resp.raise_for_status()
            data = resp.json()
        if data.get("AbstractText"):
            results.append(f"Résumé Wikipedia : {data['AbstractText']}")
        for topic in data.get("RelatedTopics", [])[:3]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append(topic["Text"][:300])
    except Exception as exc:
        logger.warning("commercial_agent.duckduckgo.failed company=%s: %s", company_name, exc)

    # 2. Site web officiel — scraping léger si disponible
    if website:
        try:
            url = website if website.startswith("http") else f"https://{website}"
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 PortaLis-CommercialAgent/1.0"},
            ) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    # Extrait uniquement le texte visible (supprime balises HTML grossièrement)
                    import re
                    text = re.sub(r"<[^>]+>", " ", resp.text)
                    text = re.sub(r"\s+", " ", text).strip()[:3000]
                    if text:
                        results.append(f"Contenu site officiel ({website}) :\n{text}")
        except Exception as exc:
            logger.warning("commercial_agent.website_scrape.failed company=%s: %s", company_name, exc)

    if not results:
        logger.warning("commercial_agent.no_web_data company=%s — Tavily non configuré", company_name)
        return (
            f"Aucune information publique trouvée pour {company_name}. "
            f"Conseil : configurer TAVILY_API_KEY pour des résultats de qualité."
        )
    return "\n\n".join(results)


# ── Tool 3 : save_company_insight ─────────────────────────────────────────────


async def save_company_insight(
    partner_id: int,
    html_content: str,
    status: str = "processed",
) -> str:
    """Sauvegarde les informations enrichies sur un client dans Odoo.

    Args:
        partner_id: ID du partenaire Odoo (res.partner).
        html_content: Contenu HTML enrichi (<h4>, <p>, <ul>/<li>).
        status: 'processed' (succès) ou 'error' (échec).
    """
    now_utc = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")
    values: dict = {"ai_insight_status": status, "ai_insight_last_update": now_utc}
    if html_content:
        values["ai_insight_html"] = html_content

    try:
        await _odoo_execute("res.partner", "write", [[partner_id], values])
    except Exception as exc:
        logger.error("commercial_agent.save_insight.failed partner_id=%s: %s", partner_id, exc)
        return f"Erreur sauvegarde Odoo (partner_id={partner_id}) : {exc}"

    label = "✅ Enrichissement sauvegardé" if status == "processed" else "⚠️ Erreur enregistrée"
    return f"{label} — partner_id={partner_id} | statut={status}"


# ── Tool 4 : get_client_commercial_history ────────────────────────────────────


async def get_client_commercial_history(partner_id: int) -> str:
    """Lit l'historique des besoins de transport et les dossiers Odoo pour un client.

    Combine deux sources :
    - res.partner.transport.history : historique des besoins saisis/IA
    - transport.shipment : dossiers transport réels créés dans l'ERP

    Args:
        partner_id: ID du partenaire Odoo (res.partner).
    """
    sections: list[str] = []

    # Source 1 : historique des besoins (module commercial_more_field)
    try:
        history: list[dict] = await _odoo_execute(  # type: ignore[assignment]
            "res.partner.transport.history",
            "search_read",
            [[["partner_id", "=", partner_id]]],
            {
                "fields": [
                    "request_date", "need", "origin", "destination",
                    "product_nature", "transport_type", "amount", "source",
                ],
                "limit": 50,
                "order": "request_date desc",
            },
        )
        if history:
            lines = ["### Historique des besoins de transport (source ERP)"]
            for h in history:
                transport_labels = {
                    "air": "Aérien", "sea": "Maritime", "road": "Routier",
                    "rail": "Ferroviaire", "river": "Fluvial",
                }
                t_type = transport_labels.get(h.get("transport_type") or "", h.get("transport_type") or "N/A")
                amount = h.get("amount") or 0
                lines.append(
                    f"- [{h.get('request_date', '?')}] {h.get('need', 'N/A')} | "
                    f"{h.get('origin', '?')} → {h.get('destination', '?')} | "
                    f"{t_type} | {h.get('product_nature', 'N/A')} | "
                    f"Montant: {amount:,.0f}"
                )
            sections.append("\n".join(lines))
        else:
            sections.append("### Historique des besoins\nAucun historique de besoin enregistré.")
    except Exception as exc:
        # Le module peut ne pas être installé dans tous les environnements
        logger.warning("commercial_agent.history.failed partner_id=%s: %s", partner_id, exc)
        sections.append("### Historique des besoins\nModule transport history non disponible.")

    # Source 2 : dossiers transport réels (transport.shipment)
    try:
        shipments: list[dict] = await _odoo_execute(  # type: ignore[assignment]
            "transport.shipment",
            "search_read",
            [[["partner_id", "=", partner_id]]],
            {
                "fields": [
                    "name", "date_order", "state", "transport_mode",
                    "origin_location", "destination_location",
                    "sale_amount", "margin_amount", "planned_qty",
                    "product_description",
                ],
                "limit": 50,
                "order": "date_order desc",
            },
        )
        if shipments:
            total_ca = sum(float(s.get("sale_amount") or 0) for s in shipments)
            total_marge = sum(float(s.get("margin_amount") or 0) for s in shipments)
            taux_marge = round(total_marge / total_ca * 100, 1) if total_ca else 0

            lines = [
                f"### Dossiers transport ({len(shipments)} dossiers | CA total: {total_ca:,.0f} | Marge: {taux_marge}%)"
            ]
            for s in shipments[:20]:  # Affiche les 20 plus récents
                state_labels = {
                    "draft": "Brouillon", "confirmed": "Confirmé",
                    "in_progress": "En cours", "done": "Terminé", "cancelled": "Annulé",
                }
                state = state_labels.get(s.get("state") or "", s.get("state") or "?")
                mode_labels = {
                    "terrestre": "Route", "maritime": "Maritime", "aerien": "Aérien", "multimodal": "Multi"
                }
                mode = mode_labels.get(s.get("transport_mode") or "", s.get("transport_mode") or "?")
                ca = float(s.get("sale_amount") or 0)
                lines.append(
                    f"- [{s.get('date_order', '?')}] {s.get('name', '?')} | {state} | "
                    f"{mode} | {s.get('origin_location', '?')} → {s.get('destination_location', '?')} | "
                    f"CA: {ca:,.0f} | {s.get('product_description', '')}"
                )
            sections.append("\n".join(lines))
        else:
            sections.append("### Dossiers transport\nAucun dossier transport trouvé pour ce client.")
    except Exception as exc:
        logger.warning("commercial_agent.shipments.failed partner_id=%s: %s", partner_id, exc)
        sections.append("### Dossiers transport\nImpossible de récupérer les dossiers transport.")

    return "\n\n".join(sections)


# ── Tool 5 : save_commercial_prediction ──────────────────────────────────────


async def save_commercial_prediction(
    partner_id: int,
    partner_name: str,
    prediction_summary: str,
    suggested_action: str,
    opportunity_type: str = "opportunite",
    confidence_score: float = 0.5,
    predicted_revenue: float | None = None,
) -> str:
    """Sauvegarde une prédiction commerciale dans la base Portalis.

    La prédiction sera soumise à validation humaine avant de créer un pipeline.

    Args:
        partner_id: ID Odoo du client (res.partner).
        partner_name: Nom du client.
        prediction_summary: Analyse complète en Markdown (tendances, raisonnement).
        suggested_action: Action commerciale précise recommandée au commercial.
        opportunity_type: 'renouvellement' | 'upsell' | 'nouveau_besoin' | 'opportunite'.
        confidence_score: Score de confiance entre 0.0 et 1.0.
        predicted_revenue: CA estimé en devise locale (null si impossible à estimer).
    """
    from app.infrastructure.db.repositories.commercial_prediction import CommercialPredictionRepository

    repo = CommercialPredictionRepository()
    try:
        pred = await repo.create(
            partner_id=partner_id,
            partner_name=partner_name,
            prediction_summary=prediction_summary,
            suggested_action=suggested_action,
            opportunity_type=opportunity_type,
            confidence_score=max(0.0, min(1.0, confidence_score)),
            predicted_revenue=predicted_revenue,
            data_sources={
                "has_web_enrichment": True,
                "has_transport_history": True,
                "has_shipments": True,
                "generated_at": datetime.now(UTC).isoformat(),
            },
        )
    except Exception as exc:
        logger.error("commercial_agent.save_prediction.failed partner_id=%s: %s", partner_id, exc)
        return f"Erreur sauvegarde prédiction (partner_id={partner_id}) : {exc}"

    confidence_pct = int(confidence_score * 100)
    return (
        f"🔮 Prédiction créée — ID={pred.id} | {partner_name} | "
        f"type={opportunity_type} | confiance={confidence_pct}% | "
        f"action={suggested_action[:80]}..."
    )


# ── Runners ───────────────────────────────────────────────────────────────────


def _build_tools() -> list:
    tools_fns = [
        ("list_clients_to_enrich", list_clients_to_enrich),
        ("search_company_web", search_company_web),
        ("save_company_insight", save_company_insight),
        ("get_client_commercial_history", get_client_commercial_history),
        ("save_commercial_prediction", save_commercial_prediction),
    ]
    return [
        lc_tool(name, description=fn.__doc__ or name)(fn)
        for name, fn in tools_fns
    ]


async def _build_agent(limit: int):
    """Instancie l'agent LangGraph et retourne (agent, config, message)."""
    run_id = uuid4()
    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    llm = await _get_llm(model_domain.provider, model_domain.name)
    agent = create_react_agent(model=llm, tools=_build_tools(), prompt=COMMERCIAL_AGENT_PROMPT)
    config = {"configurable": {"thread_id": str(run_id)}, "recursion_limit": 200}
    message = (
        f"Lance l'analyse commerciale. "
        f"Appelle list_clients_to_enrich avec limit={limit}. "
        f"Traite TOUS les clients retournés un par un : enrichissement web puis prédiction."
    )
    return agent, config, message, run_id


async def stream_commercial_enrichment(limit: int = 20) -> AsyncIterator[str]:
    """Lance l'agent commercial et streame sa progression token par token.

    Le dernier token est [RUN:{run_id}].
    """
    agent, config, message, run_id = await _build_agent(limit)

    async for event in agent.astream_events(
        {"messages": [("human", message)]},
        config=config,
        version="v2",
    ):
        if event.get("event") != "on_chat_model_stream":
            continue
        chunk = event.get("data", {}).get("chunk", {})
        if not (hasattr(chunk, "content") and chunk.content):
            continue
        content = chunk.content
        if isinstance(content, str) and content:
            yield content
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text = block.get("text", "")
                    if text:
                        yield text

    yield f"[RUN:{run_id}]"


async def run_commercial_cycle(limit: int = 50, trigger: str = "scheduled") -> dict:
    """Lance un cycle complet d'enrichissement + prédiction sans streaming.

    Écoute les événements on_tool_end pour comptabiliser les enrichissements
    et prédictions. Retourne un dict de stats utilisé par le scheduler.
    """
    logger.info("commercial.cycle.start trigger=%s limit=%d", trigger, limit)
    agent, config, message, run_id = await _build_agent(limit)

    stats = {
        "run_id": str(run_id),
        "enriched": 0,
        "enrichment_errors": 0,
        "predictions": 0,
        "prediction_errors": 0,
    }

    async for event in agent.astream_events(
        {"messages": [("human", message)]},
        config=config,
        version="v2",
    ):
        event_type = event.get("event")
        if event_type != "on_tool_end":
            continue
        tool_name = event.get("name", "")
        output = str(event.get("data", {}).get("output", ""))
        if tool_name == "save_company_insight":
            if "✅" in output:
                stats["enriched"] += 1
            else:
                stats["enrichment_errors"] += 1
        elif tool_name == "save_commercial_prediction":
            if "🔮" in output:
                stats["predictions"] += 1
            else:
                stats["prediction_errors"] += 1

    logger.info(
        "commercial.cycle.done trigger=%s run_id=%s enriched=%d errors_enrich=%d predictions=%d errors_pred=%d",
        trigger, stats["run_id"], stats["enriched"], stats["enrichment_errors"],
        stats["predictions"], stats["prediction_errors"],
    )
    return stats
