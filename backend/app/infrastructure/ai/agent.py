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


SYSTEM_PROMPT = """""Tu es un assistant IA pour la plateforme PortaLis d'INOV Consulting.
Tu aides les équipes commerciales et DAF (Direction Administrative et Financière).
Tu as accès à des outils pour rechercher des informations sur les entreprises et les données métier.
Réponds toujours en français sauf si l'utilisateur s'exprime dans une autre langue.
Sois précis, concis et professionnel.

OUTILS:
1. PortaLis: search_companies(nom), get_company_details(nom_exact)
2. ERP:
   - list_models(): tables accessibles
   - search_records(table,filters,fields,limit): liste avec filtres [["champ","=",valeur]]
   - get_record(table,id): détail par ID
   - aggregate_records(table,groupby,aggregates,filters): stats PAR groupe (groupby OBLIGATOIRE, ex:["country_id"])
   - create/update/delete_record(table,id,values): modifications
   - post_message(table,id,body): message dans discussion (subtype="note"/"comment")
3. get_current_date(): date actuelle

MAPPING TABLE ERP:
clients/contacts=res.partner | commandes=sale.order | factures=account.move | articles=product.product | pays=res.country

RÈGLES:
- aggregate_records=stats par groupe (ex: ventes par mois). groupby JAMAIS vide. Suffixes date: :day,:week,:month,:quarter,:year
- search_records=listes (ex: "donne les clients de...")
- Traduis termes métier→noms techniques pour les appels
- Parle de "l'ERP"/"système", jamais le nom du logiciel"""


@dataclass
class ChatResult:
    session_id: UUID
    response: str
    tool_used: str | None   # premier tool utilisé dans ce tour, None si aucun
    turn: int               # numéro du tour dans la session (commence à 1)


def _get_llm(provider: str, model: str):  # type: ignore[return]
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, api_key=settings.anthropic_api_key, max_tokens=4096)
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, api_key=settings.openai_api_key)
    elif provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(model=model, api_key=settings.groq_api_key)
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


async def _get_all_tools() -> list[BaseTool]:
    """Retourne les tools locaux + tools des serveurs MCP externes."""
    from app.infrastructure.ai.mcp_servers import MCP_SERVERS

    local_tools = _get_local_tools()

    if not MCP_SERVERS:
        return local_tools

    try:
        client = MultiServerMCPClient(MCP_SERVERS)
        mcp_tools = await client.get_tools()
        logger.debug("Tools MCP chargés : %d", len(mcp_tools))
        return local_tools + mcp_tools
    except Exception as exc:
        logger.warning("Impossible de charger les tools MCP : %s", exc)
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
    llm = _get_llm(model_domain.provider, model_domain.name)
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
) -> AsyncIterator[str]:
    """Stream les tokens d'une session. Le dernier token est [SESSION:{uuid}]."""
    if session_id is None:
        session_id = uuid4()

    config_repo = AiConfigRepository()
    _, model_domain, _ = await config_repo.get()
    llm = _get_llm(model_domain.provider, model_domain.name)
    tools = await _get_all_tools()

    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=SYSTEM_PROMPT,
        checkpointer=_checkpointer,
        pre_model_hook=_trim_hook,
    )
    config = {"configurable": {"thread_id": str(session_id)}}
    async for chunk in agent.astream(
        {"messages": [("human", message)]},
        config=config,
        stream_mode="messages",
    ):
        if isinstance(chunk, tuple):
            msg, _ = chunk
            if hasattr(msg, "content") and msg.content:
                yield str(msg.content)
    yield f"[SESSION:{session_id}]"


async def list_available_tools() -> list[dict]:
    """Liste tous les tools disponibles (locaux + MCP)."""
    tools = await _get_all_tools()
    return [{"name": t.name, "description": t.description or ""} for t in tools]
