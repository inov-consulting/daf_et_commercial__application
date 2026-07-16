"""Factory LangGraph Agent — gestion de sessions multi-tours.

Chaque session est identifiée par un UUID (thread_id).
L'historique des messages est conservé en mémoire via MemorySaver.
"""

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from uuid import UUID, uuid4

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool
from langchain_core.tools import tool as lc_tool
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from app.core.config import settings
from app.infrastructure.db.repositories.ai_config import AiConfigRepository

logger = logging.getLogger(__name__)

_checkpointer = MemorySaver()

# Nombre maximum de messages conservés dans le contexte (hors SystemMessage).
MAX_CONTEXT_MESSAGES = 15


def _trim_hook(state: dict) -> dict:
    """Garde les MAX_CONTEXT_MESSAGES derniers messages + le SystemMessage initial."""
    messages = state.get("messages", [])
    if len(messages) <= MAX_CONTEXT_MESSAGES:
        return {"messages": messages}
    system_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    non_system = [m for m in messages if not isinstance(m, SystemMessage)]
    return {"messages": system_msgs + non_system[-MAX_CONTEXT_MESSAGES:]}


SYSTEM_PROMPT = """Tu es un assistant IA pour la plateforme PortaLis d'INOV Consulting.
Tu aides les équipes commerciales et DAF (Direction Administrative et Financière).
Tu as accès à des outils pour rechercher des informations sur les entreprises, les prospects et les données métier.
Réponds toujours en français sauf si l'utilisateur s'exprime dans une autre langue.
Sois précis, concis et professionnel.

OUTILS DISPONIBLES - UTILISE-LES SPONTANÉMENT:

1. PortaLis (interne):
   - search_companies(nom): Recherche entreprise dans la base PortaLis
   - get_company_details(nom): Détails d'une entreprise

2. Prospects (CRM - synchronisé avec l'ERP):
   - list_prospects(status, search, limit): Liste les prospects Portalis
   - get_prospect_details(prospect_id): Détails d'un prospect
   - create_prospect(company_name, contact, email, phone, sector, notes, expected_revenue): 
     ➤ CRÉE d'abord dans l'ERP Odoo, puis dans Portalis avec le lien

3. ERP Odoo (via MCP - outils "odoo__*"):
   - odoo__search_records(table, filters, fields, limit): RECHERCHE dans l'ERP
   - odoo__create_record(table, values): CRÉE dans l'ERP
   - odoo__get_record(table, id): DÉTAIL par ID
   - odoo__update_record(table, id, values): MODIFIE
   
   MAPPING TABLE ERP:
   - Clients/entreprises → "res.partner"
   - Opportunités/prospects → "crm.lead"
   - Commandes/ventes → "sale.order"
   - Factures → "account.move" (move_type=out_invoice)
   - Produits → "product.product"

4. get_current_date(): date actuelle    

WORKFLOW CRÉATION PROSPECT AVEC CLIENT (multi-étapes):
1. L'utilisateur demande: "Crée une opportunité pour [Client]"
2. Cherche le client dans l'ERP: odoo__search_records("res.partner", [["name","ilike","Client"]], ["id","name","email"], 5)
3. Si client TROUVÉ (récupère l'ID):
   - Demande: "Client trouvé: [Nom] (ID: X). Créer l'opportunité ?"
   - Si oui → create_prospect(company_name="Opportunité X", ...) ou odoo__create_record("crm.lead", {...})
4. Si client NON TROUVÉ:
   - Demande: "Client inexistant. Créer ? Donnez email et téléphone."
   - Récupère les infos → odoo__create_record("res.partner", {"name":"Client", "is_company":True, ...})
   - Récupère le partner_id → odoo__create_record("crm.lead", {"name":"Opport X", "partner_id":partner_id, ...})
   - Puis crée le lien dans Portalis si besoin

RÈGLES ABSOLUES:
1. DÈS qu'il y a un chiffre (CA, montant, total) → utilise odoo__aggregate_records ou odoo__search_records
2. Pour "prospects" ou "opportunités":
   - Si création → utilise create_prospect (crée dans Odoo + Portalis)
   - Si recherche → utilise odoo__search_records("crm.lead", ...)
3. Pour les clients → utilise odoo__search_records("res.partner", ...) avant toute création
4. Ne dis JAMAIS "je ne trouve pas" sans avoir essayé les outils MCP
5. Parle de "l'ERP"/"système", jamais le nom du logiciel

FORMATAGE:
- Markdown TOUJOURS
- Emojis (📊, ✅, 💰, 📈, ⚠️, 🏢, 👤)
- Tableaux pour les listes
- Titres (##, ###)
- Montants: 15 000 €
- Concis mais informatif"""


@dataclass
class ChatResult:
    session_id: UUID
    response: str
    tool_used: str | None   # premier tool utilisé dans ce tour, None si aucun
    turn: int               # numéro du tour dans la session (commence à 1)


async def _get_llm(provider: str, model: str, reasoning: bool = False):  # type: ignore[return]
    """Récupère le LLM configuré.
    
    Args:
        reasoning: Si True et provider=anthropic, active le mode thinking.
    """
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        # Si reasoning activé et modèle supporte thinking (claude-3-7-sonnet+)
        if reasoning and "claude-3" in model:
            return ChatAnthropic(
                model=model, 
                api_key=settings.anthropic_api_key, 
                max_tokens=4096,
                thinking={"type": "enabled", "budget_tokens": 2000},
            )
        return ChatAnthropic(model=model, api_key=settings.anthropic_api_key, max_tokens=4096)
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, api_key=settings.openai_api_key)
    elif provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(model=model, api_key=settings.groq_api_key)
    elif provider == "deepseek":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
    raise ValueError(f"Provider inconnu : {provider}")


def _get_local_tools() -> list[BaseTool]:
    from app.infrastructure.ai.builtin_tools import BUILTIN_REGISTRY
    extra: dict = {}
    try:
        from app.infrastructure.ai.custom_tools import CUSTOM_REGISTRY
        extra = dict(CUSTOM_REGISTRY)  # type: ignore[arg-type]
    except ImportError:
        pass

    registry = {**BUILTIN_REGISTRY, **extra}
    tools: list[BaseTool] = []
    for name, fn in registry.items():
        lc = lc_tool(name, description=fn.__doc__ or name)(fn)  # type: ignore[arg-type]
        tools.append(lc)
    return tools


# Cache global du client MCP et des tools
_mcp_client: MultiServerMCPClient | None = None
_mcp_tools_cache: list[BaseTool] | None = None


async def _get_all_tools() -> list[BaseTool]:
    """Retourne les tools locaux + tools des serveurs MCP externes.
    
    Les tools MCP sont mis en cache après la première récupération pour éviter
    de redémarrer le serveur MCP à chaque appel.
    """
    from app.infrastructure.ai.mcp_servers import MCP_SERVERS

    local_tools = _get_local_tools()

    if not MCP_SERVERS:
        return local_tools

    global _mcp_client, _mcp_tools_cache
    
    # Si les tools sont déjà en cache, les retourner directement
    if _mcp_tools_cache is not None:
        logger.debug("[MCP] ♻️ Tools MCP depuis le cache")
        return local_tools + _mcp_tools_cache
    
    try:
        if _mcp_client is None:
            logger.info("[MCP] 🆕 Initialisation du client MCP...")
            _mcp_client = MultiServerMCPClient(MCP_SERVERS)
            logger.info("[MCP] ✅ Client MCP initialisé")
        
        # Récupérer et cacher les tools
        _mcp_tools_cache = await _mcp_client.get_tools()
        logger.info("[MCP] 📦 Tools MCP chargés et mis en cache : %d", len(_mcp_tools_cache))
        return local_tools + _mcp_tools_cache
    except Exception as exc:
        logger.warning("[MCP] Impossible de charger les tools MCP : %s", exc)
        # Reset le client en cas d'erreur pour retry au prochain appel
        _mcp_client = None
        _mcp_tools_cache = None
        return local_tools


def _extract_metadata(messages: list) -> tuple[str | None, int]:
    """Retourne (tool_used, turn) depuis la liste complète des messages."""
    turn = sum(1 for m in messages if isinstance(m, HumanMessage))

    tool_used: str | None = None
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            break
        if isinstance(msg, ToolMessage) and tool_used is None:
            tool_used = msg.name

    return tool_used, turn


async def run_chat_session(
    message: str,
    session_id: UUID | None = None,
) -> ChatResult:
    """Exécute un message dans une session et retourne le résultat structuré."""
    if session_id is None:
        session_id = uuid4()

    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    llm = await _get_llm(model_domain.provider, model_domain.name)
    tools = await _get_all_tools()

    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=SYSTEM_PROMPT,
        checkpointer=_checkpointer,
        pre_model_hook=_trim_hook,
    )
    config = {"configurable": {"thread_id": str(session_id)}}
    result = await agent.ainvoke({"messages": [("human", message)]}, config=config)

    messages = result.get("messages", [])
    response = str(messages[-1].content) if messages else ""
    tool_used, turn = _extract_metadata(messages)

    return ChatResult(session_id=session_id, response=response, tool_used=tool_used, turn=turn)


async def stream_chat_session(
    message: str,
    session_id: UUID | None = None,
    reasoning: bool = False,
) -> AsyncIterator[str]:
    """Stream les tokens d'une session. Le dernier token est [SESSION:{uuid}].
    
    Args:
        reasoning: Si True, active le mode raisonnement (chain-of-thought).
                   Pour Claude: utilise thinking mode. Pour OpenAI: ajoute instruction au prompt.
    """
    if session_id is None:
        session_id = uuid4()

    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    
    # Si reasoning activé, on peut utiliser un modèle spécifique ou modifier le prompt
    llm = await _get_llm(model_domain.provider, model_domain.name, reasoning=reasoning)
    tools = await _get_all_tools()
    
    # Prompt modifié pour le raisonnement si demandé
    prompt = SYSTEM_PROMPT
    if reasoning:
        prompt = f"{SYSTEM_PROMPT}\n\nRAISONNEMENT: Pense étape par étape. Montre ton raisonnement avant de répondre."

    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=prompt,
        checkpointer=_checkpointer,
        pre_model_hook=_trim_hook,
    )
    config = {"configurable": {"thread_id": str(session_id)}}

    # Stream en utilisant astream_events pour vrai streaming token par token
    collected_thinking = ""

    async for event in agent.astream_events(
        {"messages": [("human", message)]},
        config=config,
        version="v2",
    ):
        event_type = event.get("event")

        if event_type != "on_chat_model_stream":
            continue

        data = event.get("data", {})
        chunk = data.get("chunk", {})
        if not (hasattr(chunk, "content") and chunk.content):
            continue

        content = chunk.content

        # Anthropic renvoie une liste de blocs typés
        if isinstance(content, list):
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "thinking" and reasoning:
                    collected_thinking += block.get("thinking", "")
                elif block.get("type") == "text":
                    text = block.get("text", "")
                    if text:
                        yield text
        # OpenAI / Groq renvoient un string delta directement
        elif isinstance(content, str) and content:
            # Ignorer les blocs thinking injectés dans additional_kwargs
            if reasoning and hasattr(chunk, "additional_kwargs"):
                thinking = chunk.additional_kwargs.get("thinking", "")
                if thinking:
                    collected_thinking += thinking
                    continue
            yield content

    if reasoning and collected_thinking:
        yield f"\n\n🤔 **Raisonnement:**\n{collected_thinking}\n"

    yield f"[SESSION:{session_id}]"


async def list_available_tools() -> list[dict]:
    """Liste tous les tools disponibles (locaux + MCP)."""
    tools = await _get_all_tools()
    return [{"name": t.name, "description": t.description or ""} for t in tools]
