"""Configuration des serveurs MCP externes.

Pour ajouter un nouveau serveur MCP :
1. Ajouter sa config dans MCP_SERVERS en suivant le même format
2. Redémarrer l'application

Format stdio  → command + args + env + transport: "stdio"
Format HTTP   → url + transport: "streamable_http" (ou "sse")
"""

from app.core.config import settings

# Serveurs MCP externes connectés à l'agent.
# Clé = nom du serveur (préfixe optionnel pour les noms de tools).
MCP_SERVERS: dict = {}

if settings.odoo_url and settings.odoo_api_key:
    _odoo_env = {
        "ODOO_URL": settings.odoo_url + ("/" if not settings.odoo_url.endswith("/") else ""),
        "ODOO_API_KEY": settings.odoo_api_key,
    }
    if settings.odoo_db:
        _odoo_env["ODOO_DB"] = settings.odoo_db

    MCP_SERVERS["odoo"] = {
        "command": "uvx",
        "args": ["mcp-server-odoo", "--transport", "stdio"],
        "env": _odoo_env,
        "transport": "stdio",
    }
