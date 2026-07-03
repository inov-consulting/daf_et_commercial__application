"""Agent conversationnel spécialisé pour la création d'offres transport.

Flux :
  1. Conversation multi-tours → collecte des informations nécessaires
  2. Génération du document Markdown via Claude
  3. Confirmation → création du dossier dans Odoo via MCP
"""

from __future__ import annotations

import json
import logging
from uuid import UUID, uuid4

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from app.infrastructure.ai.agent import _get_llm
from app.infrastructure.db.repositories.ai_config import AiConfigRepository

logger = logging.getLogger(__name__)

_offer_checkpointer = MemorySaver()

# Nombre maximum de messages conservés dans le contexte pour l'agent d'offre
OFFER_MAX_CONTEXT_MESSAGES = 30


def _offer_trim_hook(state: dict) -> dict:
    """Garde les OFFER_MAX_CONTEXT_MESSAGES derniers messages + le SystemMessage initial."""
    messages = state.get("messages", [])
    if len(messages) <= OFFER_MAX_CONTEXT_MESSAGES:
        return {"messages": messages}
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    non_system = [m for m in messages if not isinstance(m, SystemMessage)]
    return {"messages": system_msgs + non_system[-OFFER_MAX_CONTEXT_MESSAGES:]}

# ── Prompts ───────────────────────────────────────────────────────────────────

OFFER_COLLECTION_PROMPT = """Tu es un assistant commercial spécialisé dans la création d'offres de transport pour INOV Consulting.

TON RÔLE : Collecter toutes les informations nécessaires à la création d'une offre commerciale de transport.

OUTILS DISPONIBLES :
- list_odoo_clients : Liste les clients existants dans Odoo ERP. Utilise cet outil quand l'utilisateur demande la liste des clients ou ne connaît pas le nom exact du client.
- mark_offer_completed : Marque l'offre comme terminée (statut 'completed'). APPELLE CET OUTIL quand tu as collecté TOUTES les informations et présenté le récapitulatif à l'utilisateur. Cet outil ne prend aucun argument.

INFORMATIONS À COLLECTER (pose les questions une par une, de façon naturelle) :
1. **Client** : nom exact de l'entreprise cliente
   - Si l'utilisateur ne connaît pas le nom exact, utilise l'outil list_odoo_clients pour lui présenter les options
2. **Produit transporté** : nature et description du produit
3. **Quantité** : volume/poids et unité (litres, tonnes, m³, etc.)
4. **Trajet** : lieu de chargement (origine) → lieu de livraison (destination)
5. **Mode de transport** : terrestre | maritime | aérien | multimodal
6. **Type de véhicule** : camion citerne, container, etc. (si pertinent)
7. **Date souhaitée** : date de départ prévue
8. **Prix unitaire** : tarif proposé par unité de mesure
9. **Conditions particulières** : délai de validité de l'offre, conditions de paiement, remarques

COMPORTEMENT :
- Pose les questions progressivement, ne surcharge pas l'utilisateur
- Si l'utilisateur donne plusieurs infos en une fois, enregistre-les toutes
- Quand l'utilisateur ne connaît pas le nom du client, utilise list_odoo_clients pour l'aider
- Quand tu as TOUTES les informations, présente un récapitulatif structuré, demande confirmation, ET APPELLE L'OUTIL mark_offer_completed

FORMAT DU RÉCAPITULATIF (quand toutes les infos sont collectées) :
```
📋 **Récapitulatif de l'offre**

- **Client** : [nom]
- **Produit** : [description]
- **Quantité** : [qté] [unité]
- **Trajet** : [origine] → [destination]
- **Mode** : [mode de transport]
- **Véhicule** : [type]
- **Date départ** : [date]
- **Prix unitaire** : [prix] FCFA/[unité]
- **Total estimé** : [total] FCFA
- **Validité** : [jours] jours

Toutes les informations sont-elles correctes ? Répondez "confirmer" pour valider ou indiquez les corrections.
```

RÈGLES ABSOLUES :
- Réponds TOUJOURS en français
- NE CRÉE RIEN dans aucun système — tu n'as pas ce pouvoir dans cette étape
- N'utilise AUCUN outil, AUCUNE API, AUCUN système externe
- Sois professionnel et commercial dans ton ton"""


OFFER_DOCUMENT_PROMPT = """Tu es un rédacteur d'offres commerciales de transport professionnel pour INOV Consulting.

Génère une offre commerciale complète et professionnelle au format Markdown, basée sur les données suivantes :

{collected_data}

L'offre doit avoir exactement cette structure JSON (réponds UNIQUEMENT avec le JSON, sans markdown autour) :

{{
  "title": "Offre de transport N°[REF] — [Client]",
  "reference": "OFT-[ANNÉE]-[NUMÉRO]",
  "date": "[date du jour]",
  "validity_days": [nombre de jours],
  "sections": [
    {{
      "heading": "Présentation de la prestation",
      "content": "..."
    }},
    {{
      "heading": "Détail de la prestation",
      "content": "..."
    }},
    {{
      "heading": "Conditions commerciales",
      "content": "..."
    }},
    {{
      "heading": "Conditions de paiement",
      "content": "..."
    }}
  ],
  "pricing": [
    {{"label": "Produit transporté", "value": "[produit]", "unit": ""}},
    {{"label": "Quantité", "value": [quantité], "unit": "[unité]"}},
    {{"label": "Prix unitaire", "value": [prix], "unit": "FCFA/[unité]"}},
    {{"label": "Montant HT", "value": [total], "unit": "FCFA"}},
    {{"label": "TVA (19.25%)", "value": [tva], "unit": "FCFA"}},
    {{"label": "Montant TTC", "value": [ttc], "unit": "FCFA"}}
  ],
  "route": {{
    "origin": "[lieu de chargement]",
    "destination": "[lieu de livraison]",
    "transport_mode": "[mode]",
    "vehicle_type": "[type véhicule]",
    "planned_date": "[date]"
  }},
  "client": {{
    "name": "[nom client]",
    "odoo_partner_id": [id ou null]
  }},
  "footer": "Cette offre est établie sous réserve de disponibilité et est valable [N] jours à compter de sa date d'émission."
}}

Génère une référence unique au format OFT-[ANNÉE]-XXXX (4 chiffres aléatoires).
Calcule la TVA à 19.25% et le montant TTC.
Rédige les sections de façon professionnelle et commerciale en français."""


EXTRACT_DATA_PROMPT = """Analyse cette conversation et extrait toutes les informations collectées sur l'offre de transport.
Réponds UNIQUEMENT avec un JSON valide, sans markdown autour.

Conversation :
{conversation}

JSON attendu (laisse null si l'information n'est pas mentionnée) :
{{
  "client_name": null,
  "product_description": null,
  "quantity": null,
  "quantity_unit": null,
  "origin": null,
  "destination": null,
  "transport_mode": null,
  "vehicle_type": null,
  "planned_date": null,
  "price_unit": null,
  "validity_days": null,
  "payment_conditions": null,
  "remarks": null
}}"""


# ── Service ───────────────────────────────────────────────────────────────────

async def run_offer_chat(
    message: str,
    session_id: UUID | None = None,
) -> tuple[str, UUID]:
    """Exécute un tour de conversation pour la collecte d'informations de l'offre.

    L'agent peut utiliser les outils list_odoo_clients et mark_offer_completed.

    Returns:
        (réponse_agent, session_id)
    """
    if session_id is None:
        session_id = uuid4()

    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    llm = await _get_llm(model_domain.provider, model_domain.name)

    # Import des outils
    from app.infrastructure.ai.tools.odoo_client_list_tool import list_odoo_clients_tool
    from app.infrastructure.ai.tools.mark_offer_completed_tool import mark_offer_completed_tool

    # Créer un wrapper qui injecte le session_id dans mark_offer_completed
    from langchain_core.tools import StructuredTool
    from pydantic import BaseModel

    async def _mark_with_session() -> str:
        """Appelle mark_offer_completed avec le session_id capturé."""
        from app.infrastructure.ai.tools.mark_offer_completed import mark_offer_completed
        try:
            return await mark_offer_completed(session_id)
        except Exception as exc:
            return f"Erreur: {str(exc)}"

    # Créer l'outil sans argument (session_id auto-injecté)
    mark_tool_with_session = StructuredTool.from_function(
        coroutine=_mark_with_session,
        name="mark_offer_completed",
        description="Marque l'offre comme terminée quand toutes les infos sont collectées. Le session_id est auto-injecté.",
        args_schema=type("Empty", (BaseModel,), {}),
    )

    # Agent avec outils + hook de troncature
    agent = create_react_agent(
        model=llm,
        tools=[list_odoo_clients_tool, mark_tool_with_session],
        prompt=OFFER_COLLECTION_PROMPT,
        checkpointer=_offer_checkpointer,
        pre_model_hook=_offer_trim_hook,
    )
    config = {"configurable": {"thread_id": str(session_id)}}
    result = await agent.ainvoke({"messages": [("human", message)]}, config=config)

    messages = result.get("messages", [])
    response = str(messages[-1].content) if messages else ""
    return response, session_id


async def extract_collected_data(session_id: UUID) -> dict:
    """Extrait les données structurées depuis l'historique de conversation.

    Appelle le LLM (sans tools) pour parser la conversation en JSON.
    """
    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    llm = await _get_llm(model_domain.provider, model_domain.name)

    # Récupérer l'historique depuis le checkpointer
    config = {"configurable": {"thread_id": str(session_id)}}
    state = _offer_checkpointer.get(config)
    if not state:
        return {}

    messages = state.get("channel_values", {}).get("messages", [])
    conversation_text = "\n".join(
        f"{'Utilisateur' if m.type == 'human' else 'Assistant'}: {m.content}"
        for m in messages
        if hasattr(m, "type") and m.type in ("human", "ai")
    )

    prompt_text = EXTRACT_DATA_PROMPT.format(conversation=conversation_text)
    response = await llm.ainvoke([HumanMessage(content=prompt_text)])
    content = str(response.content).strip()

    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning("offer.extract_data.parse_failed", session_id=str(session_id))
        return {}


async def generate_offer_document(collected_data: dict) -> dict:
    """Appelle Claude pour générer le document d'offre structuré (JSON).

    Returns:
        dict avec la structure complète de l'offre
    """
    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()

    # Force Claude pour la génération de document
    provider = model_domain.provider
    model_name = model_domain.name
    if provider != "anthropic":
        # Fallback sur Claude Haiku si le modèle par défaut n'est pas Anthropic
        provider = "anthropic"
        model_name = "claude-haiku-4-5"

    llm = await _get_llm(provider, model_name)

    prompt_text = OFFER_DOCUMENT_PROMPT.format(
        collected_data=json.dumps(collected_data, ensure_ascii=False, indent=2)
    )

    response = await llm.ainvoke([HumanMessage(content=prompt_text)])
    content = str(response.content).strip()

    # Nettoyer si Claude a quand même mis des balises markdown
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        logger.warning("offer_document.json_parse_failed", content_preview=content[:200])
        return {"raw": content, "parse_error": True}


async def _resolve_partner_id(client_name: str, known_id: int | None) -> int:
    """Résout le partner_id Odoo depuis le nom du client via XML-RPC.

    Raises:
        RuntimeError: si aucun partenaire trouvé
    """
    import asyncio
    from app.infrastructure.odoo.client import OdooClient

    if known_id:
        return known_id

    odoo = OdooClient()
    records = await asyncio.to_thread(
        odoo.execute,
        "res.partner",
        "search_read",
        [[("name", "ilike", client_name), ("is_company", "=", True)]],
        {"fields": ["id", "name"], "limit": 5},
    )
    if not records:
        # Essayer sans le filtre is_company
        records = await asyncio.to_thread(
            odoo.execute,
            "res.partner",
            "search_read",
            [[("name", "ilike", client_name)]],
            {"fields": ["id", "name"], "limit": 5},
        )
    if not records:
        raise RuntimeError(
            f"Client '{client_name}' introuvable dans Odoo. "
            "Créez d'abord le partenaire dans l'ERP."
        )
    partner = records[0]  # type: ignore[index]
    logger.info("offer.partner_resolved name=%s id=%s", partner["name"], partner["id"])
    return int(partner["id"])


async def _resolve_vehicle_subtype(vehicle_type: str) -> int:
    """Résout le vehicle_subtype_id depuis le nom du type de véhicule.

    Mapping texte libre → ID Odoo (Benne=1, Citerne=2, Plateau=3).
    Fallback sur le premier enregistrement disponible.
    """
    import asyncio
    from app.infrastructure.odoo.client import OdooClient

    _SUBTYPE_MAP = {
        "citerne": 2, "tanker": 2, "tank": 2,
        "benne": 1, "dumper": 1, "benne basculante": 1,
        "plateau": 3, "flatbed": 3, "porte-char": 3,
    }
    key = vehicle_type.lower().strip()
    for k, v in _SUBTYPE_MAP.items():
        if k in key:
            return v

    # Fallback : premier sous-type disponible dans Odoo
    odoo = OdooClient()
    records = await asyncio.to_thread(
        odoo.execute,
        "transport.vehicle.subtype",
        "search_read",
        [[]],
        {"fields": ["id", "name"], "limit": 1},
    )
    if records:
        return int(records[0]["id"])  # type: ignore[index]
    raise RuntimeError("Aucun type de véhicule trouvé dans Odoo.")


async def create_odoo_shipment_from_offer(offer_data: dict) -> tuple[int, str]:
    """Crée le dossier transport.shipment dans Odoo via MCP.

    Le partner_id est résolu en Python (XML-RPC) avant l'appel agent
    pour garantir qu'il est toujours fourni.

    Returns:
        (odoo_shipment_id, odoo_shipment_name)

    Raises:
        RuntimeError: si la création échoue
    """
    route = offer_data.get("route", {})
    client = offer_data.get("client", {})
    pricing = {p["label"]: p["value"] for p in offer_data.get("pricing", [])}

    # Résolution déterministe du partner_id AVANT l'appel agent
    client_name = client.get("name") or offer_data.get("collected_data", {}).get("client_name", "")
    if not client_name:
        raise RuntimeError("Nom du client manquant dans les données de l'offre.")

    partner_id = await _resolve_partner_id(client_name, client.get("odoo_partner_id"))

    # Normaliser transport_mode vers les valeurs exactes acceptées par l'ERP
    _MODE_MAP = {
        "terrestre": "terrestre", "road": "terrestre", "route": "terrestre",
        "maritime": "maritime", "sea": "maritime", "mer": "maritime",
        "aérien": "aerien", "aerien": "aerien", "aerian": "aerien", "air": "aerien",
        "multimodal": "multimodal", "multi": "multimodal",
    }
    raw_mode = str(route.get("transport_mode", "terrestre")).lower().strip()
    transport_mode = _MODE_MAP.get(raw_mode, "terrestre")

    # Résoudre vehicle_subtype_id (obligatoire pour le mode terrestre)
    vehicle_subtype_id: int | None = None
    if transport_mode == "terrestre":
        vehicle_subtype_id = await _resolve_vehicle_subtype(route.get("vehicle_type") or "")

    # Extraire les valeurs numériques brutes du pricing
    qty = pricing.get("Quantité") or pricing.get("quantity") or 0
    price = pricing.get("Prix unitaire") or pricing.get("price_unit") or 0
    try:
        qty = float(str(qty).replace(" ", "").replace(",", ".").split("/")[0])
        price = float(str(price).replace(" ", "").replace(",", ".").split("/")[0])
    except (ValueError, AttributeError):
        qty = 0.0
        price = 0.0

    # Normaliser la date au format YYYY-MM-DD attendu par Odoo
    import re
    from datetime import date as _date, timedelta
    raw_date = str(route.get("planned_date", "")).strip()

    def _parse_date(raw: str) -> str:
        """Tente de convertir une date brute (ISO ou relative FR) en YYYY-MM-DD.

        Exemples acceptés : '2026-07-10', 'demain', 'lundi', 'dans 3 jours'.
        Fallback : aujourd'hui si le format est non reconnu.
        """
        # 1. Format ISO déjà correct
        iso = re.search(r"(\d{4}-\d{2}-\d{2})", raw)
        if iso:
            return iso.group(1)

        today = _date.today()
        raw_lower = raw.lower()

        # 2. Mots-clés relatifs
        if "aujourd" in raw_lower or "today" in raw_lower:
            return today.isoformat()
        if "demain" in raw_lower or "tomorrow" in raw_lower:
            return (today + timedelta(days=1)).isoformat()
        if "après-demain" in raw_lower or "apres-demain" in raw_lower:
            return (today + timedelta(days=2)).isoformat()

        # 3. "dans N jours/semaines"
        m = re.search(r"dans\s+(\d+)\s+(jour|semaine)", raw_lower)
        if m:
            n = int(m.group(1))
            if "semaine" in m.group(2):
                n *= 7
            return (today + timedelta(days=n)).isoformat()

        # 4. Jour de la semaine → prochain occurrence
        _JOURS = {
            "lundi": 0, "mardi": 1, "mercredi": 2, "jeudi": 3,
            "vendredi": 4, "samedi": 5, "dimanche": 6,
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6,
        }
        for name, weekday in _JOURS.items():
            if name in raw_lower:
                days_ahead = (weekday - today.weekday()) % 7 or 7
                return (today + timedelta(days=days_ahead)).isoformat()

        # 5. Format DD/MM/YYYY ou DD-MM-YYYY
        m2 = re.search(r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})", raw)
        if m2:
            d, mo, y = m2.group(1), m2.group(2), m2.group(3)
            return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"

        # 6. Fallback : aujourd'hui pour ne pas bloquer la création
        logger.warning("offer.date_parse_failed raw=%r → fallback today=%s", raw, today.isoformat())
        return today.isoformat()

    date_order = _parse_date(raw_date)

    # Création directe via XML-RPC — pas besoin d'agent pour un simple create
    import asyncio
    from app.infrastructure.odoo.client import OdooClient

    values = {
        "partner_id": partner_id,
        "origin_location": route.get("origin", ""),
        "destination_location": route.get("destination", ""),
        "transport_mode": transport_mode,
        "date_order": date_order,
    }
    if price:
        values["sale_price_unit"] = price
    if qty:
        values["planned_qty"] = qty

    # product_description = marchandise transportée (ce que l'utilisateur a spécifié)
    collected = offer_data.get("collected_data") or {}
    goods = (
        collected.get("product_description")
        or collected.get("goods_description")
        or collected.get("merchandise")
        or collected.get("product")
    )
    if goods:
        values["product_description"] = str(goods)

    # notes = titre de l'offre (référence commerciale) en HTML pour Odoo
    title = offer_data.get("title") or offer_data.get("reference")
    if title:
        values["notes"] = f"<p>{title}</p>"

    if vehicle_subtype_id:
        values["vehicle_subtype_id"] = vehicle_subtype_id

    odoo = OdooClient()
    new_id = await asyncio.to_thread(odoo.execute, "transport.shipment", "create", [values])
    new_id = int(new_id)  # type: ignore[arg-type]

    # Récupérer la référence générée par Odoo
    records = await asyncio.to_thread(
        odoo.execute,
        "transport.shipment",
        "search_read",
        [[("id", "=", new_id)]],
        {"fields": ["id", "name"], "limit": 1},
    )
    name = records[0]["name"] if records else str(new_id)  # type: ignore[index]
    logger.info("odoo_shipment.created id=%s name=%s", new_id, name)
    return new_id, name
