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

from app.infrastructure.ai.agent import _get_all_tools, _get_llm
from app.infrastructure.db.repositories.ai_config import AiConfigRepository

logger = logging.getLogger(__name__)

_offer_checkpointer = MemorySaver()

# ── Prompts ───────────────────────────────────────────────────────────────────

OFFER_COLLECTION_PROMPT = """Tu es un assistant commercial spécialisé dans la création d'offres de transport pour INOV Consulting.

TON RÔLE : Collecter toutes les informations nécessaires à la création d'une offre commerciale de transport.

IMPORTANT : Tu n'as accès à AUCUN outil externe. Tu ne dois PAS créer, modifier ou consulter quoi que ce soit dans un système tiers. Tu collectes uniquement les informations par la conversation.

INFORMATIONS À COLLECTER (pose les questions une par une, de façon naturelle) :
1. **Client** : nom exact de l'entreprise cliente
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
- Quand tu as TOUTES les informations, présente un récapitulatif structuré et demande confirmation

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

    IMPORTANT : Aucun tool MCP n'est utilisé ici. L'agent collecte uniquement par la conversation.

    Returns:
        (réponse_agent, session_id)
    """
    if session_id is None:
        session_id = uuid4()

    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    llm = await _get_llm(model_domain.provider, model_domain.name)

    # Aucun tool — conversation pure pour la collecte
    agent = create_react_agent(
        model=llm,
        tools=[],
        prompt=OFFER_COLLECTION_PROMPT,
        checkpointer=_offer_checkpointer,
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


async def create_odoo_shipment_from_offer(offer_data: dict) -> tuple[int, str]:
    """Crée le dossier transport.shipment dans Odoo via MCP.

    Returns:
        (odoo_shipment_id, odoo_shipment_name)

    Raises:
        RuntimeError: si la création échoue
    """
    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    llm = await _get_llm(model_domain.provider, model_domain.name)
    tools = await _get_all_tools()

    route = offer_data.get("route", {})
    client = offer_data.get("client", {})
    pricing = {p["label"]: p["value"] for p in offer_data.get("pricing", [])}

    instruction = f"""Tu dois créer un dossier de transport dans l'ERP en utilisant l'outil odoo__create_record.

Voici les informations de l'offre validée :
- Client : {client.get('name')} (partner_id Odoo : {client.get('odoo_partner_id')})
- Origine : {route.get('origin')}
- Destination : {route.get('destination')}
- Mode de transport : {route.get('transport_mode')}
- Type de véhicule : {route.get('vehicle_type')}
- Date prévue : {route.get('planned_date')}
- Quantité : {pricing.get('Quantité')}
- Prix unitaire : {pricing.get('Prix unitaire')}
- Référence offre : {offer_data.get('reference')}

Étapes :
1. Si partner_id est null, cherche d'abord le client avec odoo__search_records("res.partner", ...)
2. Crée le dossier avec odoo__create_record("transport.shipment", {{
   "partner_id": <id_client>,
   "origin_location": "<origine>",
   "destination_location": "<destination>",
   "transport_mode": "<terrestre|maritime|aerien|multimodal>",
   "sale_price_unit": <prix_unitaire>,
   "planned_qty": <quantité>,
   "date_order": "<date>",
   "product_description": "<description produit>"
}})
3. Retourne EXACTEMENT cette réponse (rien d'autre) :
ODOO_CREATED:{{id}}:{{name}}

où {{id}} est l'ID Odoo retourné et {{name}} est la référence (name) du dossier créé."""

    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt="Tu es un assistant qui crée des dossiers dans l'ERP. Suis les instructions exactement.",
    )
    config = {"configurable": {"thread_id": str(uuid4())}}
    result = await agent.ainvoke({"messages": [("human", instruction)]}, config=config)

    messages = result.get("messages", [])
    response = str(messages[-1].content) if messages else ""

    # Parser la réponse structurée
    for line in response.split("\n"):
        if line.startswith("ODOO_CREATED:"):
            parts = line.replace("ODOO_CREATED:", "").split(":", 1)
            if len(parts) == 2:
                try:
                    return int(parts[0]), parts[1].strip()
                except ValueError:
                    pass

    logger.error("odoo_shipment.create_failed", response=response[:500])
    raise RuntimeError(f"Impossible de parser la réponse Odoo : {response[:200]}")
