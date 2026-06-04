"""Catalogue des tools built-in disponibles.

Chaque tool est une fonction Python simple.
Pour enregistrer un nouveau tool builtin :
1. Ajouter la fonction ici
2. L'enregistrer dans BUILTIN_REGISTRY avec son nom snake_case
3. Créer l'entrée en DB via POST /api/v1/tools avec tool_type="builtin"
"""

import httpx

from app.core.config import settings

# ── Tools built-in ────────────────────────────────────────────────────────

async def search_companies(query: str) -> str:
    """Recherche des entreprises dans la base locale par nom."""
    from app.infrastructure.db.models.company import CompanyOrm
    rows = await CompanyOrm.filter(name__icontains=query, is_active=True).limit(5)
    if not rows:
        return f"Aucune entreprise trouvée pour '{query}'"
    return "\n".join(f"- {r.name} ({r.country})" for r in rows)


async def get_company_details(company_name: str) -> str:
    """Retourne les détails d'une entreprise par son nom exact."""
    from app.infrastructure.db.models.company import CompanyOrm
    row = await CompanyOrm.get_or_none(name=company_name)
    if row is None:
        return f"Entreprise '{company_name}' introuvable"
    return (
        f"Nom: {row.name}\n"
        f"Pays: {row.country}\n"
        f"Devise: {row.default_currency}\n"
        f"Active: {row.is_active}"
    )


async def get_current_date() -> str:
    """Retourne la date et l'heure actuelles."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%d %H:%M UTC")


# ── Registre ─────────────────────────────────────────────────────────────
# Nom snake_case → fonction async

BUILTIN_REGISTRY: dict[str, object] = {
    "search_companies": search_companies,
    "get_company_details": get_company_details,
    "get_current_date": get_current_date,
}
