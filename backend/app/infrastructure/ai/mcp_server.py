"""MCP Server — expose tous les tools Python enregistrés.

Pour ajouter un tool :
1. Écrire la fonction async dans builtin_tools.py ou custom_tools.py
2. L'enregistrer dans BUILTIN_REGISTRY (ou CUSTOM_REGISTRY)
C'est tout — le serveur le charge automatiquement au démarrage.
"""
 
import logging

from mcp.server.fastmcp import FastMCP

from app.infrastructure.ai.builtin_tools import BUILTIN_REGISTRY

logger = logging.getLogger(__name__)

mcp = FastMCP("portalis")

# Charge custom_tools si le fichier existe (optionnel)
try:
    from app.infrastructure.ai.custom_tools import CUSTOM_REGISTRY
except ImportError:
    CUSTOM_REGISTRY: dict = {}


def register_all_tools() -> None:
    """Enregistre tous les tools (builtin + custom) dans le MCP server."""
    registry = {**BUILTIN_REGISTRY, **CUSTOM_REGISTRY}
    for name, fn in registry.items():
        mcp.tool(name=name, description=fn.__doc__ or name)(fn)
        logger.debug("Tool MCP enregistré : %s", name)
