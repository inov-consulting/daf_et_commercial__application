"""Catalogue des tools built-in disponibles.

Chaque tool est une fonction Python simple.
Pour enregistrer un nouveau tool builtin :
1. Ajouter la fonction ici
2. L'enregistrer dans BUILTIN_REGISTRY avec son nom snake_case
3. Créer l'entrée en DB via POST /api/v1/tools avec tool_type="builtin"
"""



# ── Tools built-in ────────────────────────────────────────────────────────

from datetime import UTC

from tortoise.expressions import Q


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
    from datetime import datetime
    now = datetime.now(UTC)
    return now.strftime("%Y-%m-%d %H:%M UTC")


async def list_prospects(status: str | None = None, search: str | None = None, limit: int = 10) -> str:
    """Liste les prospects commerciaux avec filtres optionnels.
    
    Args:
        status: Statut du prospect (nouveau, contacte, qualifie, converti, perdu)
        search: Recherche par nom d'entreprise ou contact
        limit: Nombre maximum de résultats (défaut: 10)
    """
    from app.infrastructure.db.models.prospect import ProspectOrm
    from app.services.prospect_sync import ProspectSyncService
    
    query = ProspectOrm.all()
    if status:
        query = query.filter(status=status)
    if search:
        query = query.filter(
            Q(company_name__icontains=search) | 
            Q(contact_name__icontains=search) |
            Q(email__icontains=search)
        )
    
    prospects = await query.limit(limit).all()
    if not prospects:
        return "🔍 **Aucun prospect trouvé.**"
    
    sync_service = ProspectSyncService()
    
    # Header Markdown
    lines = [
        f"## 📋 Prospects ({len(prospects)} résultats)",
        "",
        "| Entreprise | Statut | Email | CA Prévu | Proba | Assigné |",
        "|------------|--------|-------|----------|-------|----------|"
    ]
    
    for p in prospects:
        company = p.company_name or "N/A"
        stat_emoji = {
            "nouveau": "🆕",
            "contacte": "📞",
            "qualifie": "✅",
            "converti": "💰",
            "perdu": "❌"
        }.get(p.status, "❓")
        email = p.email or "-"
        
        # Enrichissement Odoo
        revenue = "-"
        probability = "-"
        assigned = "-"
        
        if p.odoo_lead_id:
            try:
                odoo_data = await sync_service.get_odoo_lead(p.odoo_lead_id)
                if odoo_data:
                    rev = odoo_data.get('expected_revenue', 0) or 0
                    prob = odoo_data.get('probability', 0) or 0
                    revenue = f"{rev:,.0f} €".replace(",", " ")
                    probability = f"{prob}%"
                    user = odoo_data.get('user_id', [None, '-'])[1] if odoo_data.get('user_id') else '-'
                    assigned = user
            except Exception:
                pass
        
        lines.append(f"| **{company}** | {stat_emoji} {p.status} | {email} | {revenue} | {probability} | {assigned} |")
    
    return "\n".join(lines)


async def get_prospect_details(prospect_id: str) -> str:
    """Récupère les détails d'un prospect par son ID.
    
    Args:
        prospect_id: UUID du prospect
    """
    from uuid import UUID
    from app.infrastructure.db.models.prospect import ProspectOrm
    from app.services.prospect_sync import ProspectSyncService
    
    try:
        p = await ProspectOrm.get_or_none(id=UUID(prospect_id))
        if not p:
            return f"❌ Prospect avec ID '{prospect_id}' introuvable."
        
        # Emoji statut
        stat_emoji = {
            "nouveau": "🆕",
            "contacte": "📞",
            "qualifie": "✅",
            "converti": "💰",
            "perdu": "❌"
        }.get(p.status, "❓")
        
        lines = [
            f"## 🏢 {p.company_name or 'N/A'}",
            "",
            "### 📊 Informations générales",
            f"- **Statut:** {stat_emoji} {p.status}",
            f"- **Contact:** {p.contact_name or 'N/A'}",
            f"- **Email:** {p.email or 'N/A'}",
            f"- **Téléphone:** {p.phone or 'N/A'}",
            f"- **Secteur:** {p.portalis_sector or 'N/A'}",
            "",
            "### 📝 Notes",
            f"> {p.portalis_notes or '*Aucune note*'}",
            "",
            f"*Créé le: {p.created_at}*",
        ]
        
        # Enrichissement Odoo
        if p.odoo_lead_id:
            try:
                sync_service = ProspectSyncService()
                odoo_data = await sync_service.get_odoo_lead(p.odoo_lead_id)
                if odoo_data:
                    revenue = odoo_data.get('expected_revenue', 0) or 0
                    probability = odoo_data.get('probability', 0) or 0
                    assigned = odoo_data.get('user_id', [None, 'N/A'])[1] if odoo_data.get('user_id') else 'Non assigné'
                    team = odoo_data.get('team_id', [None, 'N/A'])[1] if odoo_data.get('team_id') else 'N/A'
                    priority = odoo_data.get('priority', '0')
                    priority_str = {'0': '🔵 Faible', '1': '🟡 Moyenne', '2': '🟠 Haute', '3': '🔴 Très haute'}.get(priority, '⚪ N/A')
                    
                    lines.extend([
                        "",
                        "### 💼 Données Pipeline",
                        f"- **CA prévu:** {revenue:,.0f} €".replace(",", " "),
                        f"- **Probabilité:** {probability}%",
                        f"- **Priorité:** {priority_str}",
                        f"- **Assigné à:** {assigned}",
                        f"- **Équipe:** {team}",
                    ])
            except Exception:
                lines.extend(["", "### 💼 Données Pipeline", "*ERP temporairement indisponible*"])
        
        return "\n".join(lines)
        
    except ValueError:
        return f"❌ ID '{prospect_id}' invalide. Format attendu: UUID."


async def create_prospect(
    company_name: str,
    contact_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    sector: str | None = None,
    notes: str | None = None,
) -> str:
    """Crée un nouveau prospect commercial.
    
    Args:
        company_name: Nom de l'entreprise (obligatoire)
        contact_name: Nom du contact
        email: Email de contact
        phone: Numéro de téléphone
        sector: Secteur d'activité
        notes: Notes commerciales
    """
    from app.infrastructure.db.models.prospect import ProspectOrm
    
    prospect = await ProspectOrm.create(
        company_name=company_name,
        contact_name=contact_name,
        email=email,
        phone=phone,
        portalis_sector=sector,
        portalis_notes=notes,
        status="nouveau",
    )
    
    lines = [
        f"## ✅ Prospect créé avec succès",
        "",
        f"**🏢 Entreprise:** {company_name}",
        f"**👤 Contact:** {contact_name or 'N/A'}",
        f"**📧 Email:** {email or 'N/A'}",
        f"**📱 Téléphone:** {phone or 'N/A'}",
        f"**🏷️ Secteur:** {sector or 'N/A'}",
        "",
        f"🆔 **ID:** `{prospect.id}`",
        f"📊 **Statut:** 🆕 nouveau",
        "",
        "*Le prospect est maintenant dans votre pipeline commercial.*"
    ]
    
    return "\n".join(lines)


# ── Registre ─────────────────────────────────────────────────────────────
# Nom snake_case → fonction async

BUILTIN_REGISTRY: dict[str, object] = {
    "search_companies": search_companies,
    "get_company_details": get_company_details,
    "get_current_date": get_current_date,
    "list_prospects": list_prospects,
    "get_prospect_details": get_prospect_details,
    "create_prospect": create_prospect,
}
