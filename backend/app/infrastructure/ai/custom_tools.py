"""Tes custom tools MCP — ajoute tes fonctions ici.

Pour créer un nouveau tool :
1. Écrire une fonction async avec une docstring claire (utilisée comme description)
2. L'ajouter dans CUSTOM_REGISTRY avec son nom snake_case

Exemple :
    async def get_invoice_status(invoice_id: str) -> str:
        \"\"\"Retourne le statut d'une facture par son ID.\"\"\"
        ...

    CUSTOM_REGISTRY = {
        "get_invoice_status": get_invoice_status,
    }
"""

# ── Tes tools ──────────────────────────────────────────────────────────────


# ── Registre ──────────────────────────────────────────────────────────────

CUSTOM_REGISTRY: dict[str, object] = {
    # "nom_du_tool": ma_fonction,
}
