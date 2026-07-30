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


def get_current_date() -> str:
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
    
    from app.services.prospect_sync import ProspectSyncService
    sync_service = ProspectSyncService()
    
    # Récupération batch des données Odoo (une seule requête pour tous les leads)
    lead_ids = [p.odoo_lead_id for p in prospects if p.odoo_lead_id]
    odoo_data_map = await sync_service.get_odoo_leads_batch(lead_ids) if lead_ids else {}
    
    # Header Markdown
    lines = [
        f"## 📋 Prospects ({len(prospects)} résultats)",
        "",
        "| Entreprise | Statut | Email | CA Prévu | Proba | Assigné |",
        "|------------|--------|-------|----------|-------|----------|"
    ]
    
    for p in prospects:
        stat_emoji = {
            "nouveau": "🆕",
            "contacte": "📞",
            "qualifie": "✅",
            "converti": "💰",
            "perdu": "❌"
        }.get(p.status, "❓")
        
        # Enrichissement depuis le cache Odoo
        company = "N/A"
        email = "-"
        revenue = "-"
        probability = "-"
        assigned = "-"
        
        if p.odoo_lead_id and p.odoo_lead_id in odoo_data_map:
            odoo_data = odoo_data_map[p.odoo_lead_id]
            company = odoo_data.get('name', 'N/A')
            email = odoo_data.get('email_from', '-') or '-'
            rev = odoo_data.get('expected_revenue', 0) or 0
            prob = odoo_data.get('probability', 0) or 0
            revenue = f"{rev:,.0f} €".replace(",", " ")
            probability = f"{prob}%"
            user = odoo_data.get('user_id', [None, '-'])[1] if odoo_data.get('user_id') else '-'
            assigned = user
        
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
        
        # Données depuis Odoo
        company = "N/A"
        contact = "N/A"
        email = "N/A"
        phone = "N/A"
        odoo_id = p.odoo_lead_id or "Non lié"
        
        if p.odoo_lead_id:
            try:
                sync_service = ProspectSyncService()
                odoo_data = await sync_service.get_odoo_lead(p.odoo_lead_id)
                if odoo_data:
                    company = odoo_data.get('name', 'N/A')
                    contact = odoo_data.get('contact_name', 'N/A') or 'N/A'
                    email = odoo_data.get('email_from', 'N/A') or 'N/A'
                    phone = odoo_data.get('phone', 'N/A') or 'N/A'
            except Exception:
                pass
        
        lines = [
            f"## 🏢 {company}",
            "",
            "### 📊 Informations générales",
            f"- **Statut:** {stat_emoji} {p.status}",
            f"- **Contact:** {contact}",
            f"- **Email:** {email}",
            f"- **Téléphone:** {phone}",
            f"- **Secteur:** {p.portalis_sector or 'N/A'}",
            f"- **ID ERP:** {odoo_id}",
            "",
            "### 📝 Notes",
            f"> {p.portalis_notes or '*Aucune note*'}",
            "",
            f"*Créé le: {p.created_at}*",
        ]
        
        # Enrichissement Odoo
        if p.odoo_lead_id:
            try:
                from app.services.prospect_sync import ProspectSyncService
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


async def search_odoo_prospects(name: str) -> str:
    """Recherche des prospects dans l'ERP Odoo par nom.
    
    Args:
        name: Nom de l'entreprise ou du contact à rechercher
    """
    from app.services.prospect_sync import ProspectSyncService
    
    sync_service = ProspectSyncService()
    leads = await sync_service.search_lead_by_name(name)
    
    if not leads:
        return f"🔍 Aucun prospect trouvé dans l'ERP pour '{name}'"
    
    lines = [f"## 🔍 Prospects trouvés dans l'ERP pour '{name}'", ""]
    
    for lead in leads:
        lead_id = lead.get('id')
        lead_name = lead.get('name', 'N/A')
        contact = lead.get('contact_name') or 'N/A'
        email = lead.get('email_from') or 'N/A'
        phone = lead.get('phone') or 'N/A'
        revenue = lead.get('expected_revenue', 0) or 0
        lead_type = lead.get('type', 'lead')
        
        type_emoji = {'lead': '📋', 'opportunity': '💼'}.get(lead_type, '📋')
        
        lines.extend([
            f"### {type_emoji} {lead_name}",
            f"- **ID ERP:** `{lead_id}`",
            f"- **Contact:** {contact}",
            f"- **Email:** {email}",
            f"- **Téléphone:** {phone}",
        ])
        if revenue:
            lines.append(f"- **CA Prévu:** {revenue:,} €".replace(",", " "))
        lines.append("")
    
    return "\n".join(lines)


async def create_prospect(
    company_name: str,
    opportunity_name: str | None = None,
    contact_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    sector: str | None = None,
    notes: str | None = None,
    expected_revenue: int | None = None,
) -> str:
    """Crée un nouveau prospect commercial. Vérifie d'abord si existe dans l'ERP.
    
    Args:
        company_name: Nom de l'entreprise (obligatoire)
        opportunity_name: Titre de l'opportunité/lead (défaut: même que company_name)
        contact_name: Nom du contact
        email: Email de contact
        phone: Numéro de téléphone
        sector: Secteur d'activité
        notes: Notes commerciales
        expected_revenue: CA prévu en euros
    """
    # Si pas de nom d'opportunité spécifié, utiliser le nom de l'entreprise
    lead_name = opportunity_name or company_name
    import logging
    logger = logging.getLogger(__name__)
    
    from app.infrastructure.db.models.prospect import ProspectOrm
    from app.services.prospect_sync import ProspectSyncService
    from tortoise.expressions import Q
    
    sync_service = ProspectSyncService()
    
    # 1. Vérifier d'abord si existe dans l'ERP Odoo
    logger.info(f"[AI Tool] Recherche '{company_name}' dans l'ERP...")
    existing_odoo = await sync_service.search_lead_by_name(company_name)
    
    if existing_odoo:
        lead = existing_odoo[0]  # Premier résultat
        lead_id = lead.get('id')
        lead_name = lead.get('name')
        logger.info(f"[AI Tool] Prospect existant trouvé dans Odoo: ID={lead_id}")
        
        # Vérifier si déjà dans Portalis
        existing_portalis = await ProspectOrm.get_or_none(odoo_lead_id=lead_id)
        if existing_portalis:
            return (
                f"⚠️ **Prospect déjà existant**\n\n"
                f"🏢 {lead_name}\n"
                f"🔗 ID ERP: `{lead_id}`\n"
                f"🆔 ID Portalis: `{existing_portalis.id}`\n\n"
                f"*Ce prospect existe déjà dans les deux systèmes.*"
            )
        
        # Existe dans Odoo mais pas dans Portalis → créer lien avec erp_metadata
        logger.info(f"[AI Tool] Création lien Portalis pour Odoo ID={lead_id}")
        erp_metadata = {
            "id": lead_id,
            "name": lead.get("name"),  # Titre du lead/opportunité
            "partner_name": lead.get("partner_name"),  # ← Nom de l'entreprise
            "type": lead.get("type", "lead"),
            "contact_name": lead.get("contact_name"),
            "email_from": lead.get("email_from"),
            "phone": lead.get("phone"),
            "expected_revenue": lead.get("expected_revenue"),
            "probability": lead.get("probability"),
            "partner_id": lead.get("partner_id"),
            "user_id": lead.get("user_id"),
            "team_id": lead.get("team_id"),
        }
        prospect = await ProspectOrm.create(
            portalis_sector=sector,
            portalis_notes=notes,
            status="nouveau",
            odoo_lead_id=lead_id,
            erp_metadata=erp_metadata,
        )
        # Nom de l'entreprise pour affichage (partner_name ou name)
        display_company = lead.get("partner_name") or lead.get("name") or lead_name
        return (
            f"✅ **Prospect lié à l'ERP**\n\n"
            f"🏢 {display_company}\n"
            f"🔗 ID ERP: `{lead_id}`\n"
            f"🆔 ID Portalis: `{prospect.id}`\n\n"
            f"*Ce prospect existait dans l'ERP, il est maintenant suivi dans Portalis.*"
        )
    
    # 2. Pas trouvé dans Odoo → créer dans les deux
    logger.info(f"[AI Tool] Aucun existant, création dans Odoo: entreprise={company_name}, lead={lead_name}")
    try:
        odoo_lead_id = await sync_service.create_in_odoo(
            name=lead_name,  # ← Titre de l'opportunité/lead
            partner_name=company_name,  # ← Nom de l'entreprise
            contact_name=contact_name,
            email=email,
            phone=phone,
            user_id=None,
            team_id=None,
            expected_revenue=expected_revenue or 0,
        )
        logger.info(f"[AI Tool] Lead Odoo créé avec ID: {odoo_lead_id}")
    except Exception as exc:
        logger.error(f"[AI Tool] Erreur création Odoo: {exc}")
        return f"❌ Erreur création dans l'ERP: {exc}"
    
    if not odoo_lead_id:
        return "❌ L'ERP n'a pas retourné d'ID pour le lead"
    
    # 3. Construction des erp_metadata avec les données fournies
    # name = titre du lead/opportunité (lead_name)
    # partner_name = nom de l'entreprise (company_name)
    erp_metadata = {
        "id": odoo_lead_id,
        "name": lead_name,  # ← Titre/opportunité
        "partner_name": company_name,  # ← Nom de l'entreprise
        "type": "lead",
        "contact_name": contact_name,
        "email_from": email,
        "phone": phone,
        "expected_revenue": expected_revenue,
        "probability": None,
        "partner_id": None,
        "user_id": None,
        "team_id": None,
    }
    
    # 4. Créer dans Portalis avec erp_metadata
    logger.info(f"[AI Tool] Création prospect Portalis avec odoo_lead_id={odoo_lead_id}")
    prospect = await ProspectOrm.create(
        portalis_sector=sector,
        portalis_notes=notes,
        status="new",
        odoo_lead_id=odoo_lead_id,
        erp_metadata=erp_metadata,
    )
    logger.info(f"[AI Tool] Prospect Portalis créé avec ID: {prospect.id}")
    
    # 4. Récupérer les données finales d'Odoo pour réponse complète + mettre à jour erp_metadata
    logger.info(f"[AI Tool] Récupération données finales Odoo ID={odoo_lead_id}")
    try:
        odoo_final = await sync_service.get_odoo_lead(odoo_lead_id)
    except Exception as exc:
        logger.warning(f"[AI Tool] Impossible de récupérer données finales Odoo: {exc}")
        odoo_final = None
    
    # Mettre à jour erp_metadata avec les données fraîches d'Odoo
    if odoo_final:
        fresh_metadata = {
            "id": odoo_lead_id,
            "name": odoo_final.get("name"),
            "partner_name": odoo_final.get("partner_name"),  # ← Nom de l'entreprise réel
            "contact_name": odoo_final.get("contact_name"),
            "email_from": odoo_final.get("email_from"),
            "phone": odoo_final.get("phone"),
            "expected_revenue": odoo_final.get("expected_revenue"),
            "probability": odoo_final.get("probability"),
            "type": odoo_final.get("type"),
            "partner_id": odoo_final.get("partner_id"),
            "user_id": odoo_final.get("user_id"),
            "team_id": odoo_final.get("team_id"),
        }
        # Enlever les valeurs None pour garder erp_metadata propre
        fresh_metadata = {k: v for k, v in fresh_metadata.items() if v is not None}
        prospect.erp_metadata = fresh_metadata
        await prospect.save()
        logger.info(f"[AI Tool] erp_metadata mis à jour avec partner_name={fresh_metadata.get('partner_name')}")
    
    # Construction réponse avec données Odoo (source de vérité) + Portalis
    if odoo_final:
        # Utiliser partner_name comme nom d'entreprise, fallback sur name
        odoo_company = odoo_final.get('partner_name') or odoo_final.get('name', company_name)
        odoo_name = odoo_final.get('name', company_name)
        odoo_contact = odoo_final.get('contact_name', contact_name) or 'N/A'
        odoo_email = odoo_final.get('email_from', email) or 'N/A'
        odoo_phone = odoo_final.get('phone', phone) or 'N/A'
        odoo_revenue = odoo_final.get('expected_revenue', expected_revenue) or 0
        odoo_type = odoo_final.get('type', 'lead')
    else:
        # Fallback sur les paramètres si Odoo indisponible
        odoo_company = company_name
        odoo_name = company_name
        odoo_contact = contact_name or 'N/A'
        odoo_email = email or 'N/A'
        odoo_phone = phone or 'N/A'
        odoo_revenue = expected_revenue or 0
        odoo_type = 'lead'
    
    type_emoji = {'lead': '📋', 'opportunity': '💼'}.get(odoo_type, '📋')
    
    lines = [
        f"## ✅ Prospect créé avec succès {type_emoji}",
        "",
        "### 🏢 Données ERP (source de vérité)",
        f"- **Entreprise:** {odoo_company}",
        f"- **Titre/Opp:** {odoo_name}",
        f"- **Contact:** {odoo_contact}",
        f"- **Email:** {odoo_email}",
        f"- **Téléphone:** {odoo_phone}",
    ]
    
    if odoo_revenue:
        lines.append(f"- **CA Prévu:** {odoo_revenue:,.0f} €".replace(",", " "))
    
    lines.extend([
        "",
        "### 🔗 Données Portalis",
        f"- **ID Portalis:** `{prospect.id}`",
        f"- **ID ERP:** `{odoo_lead_id}`",
        f"- **Secteur:** {sector or 'N/A'}",
        f"- **Statut:** 🆕 nouveau",
    ])
    
    if notes:
        lines.extend(["", f"### 📝 Notes\n> {notes}"])
    
    lines.extend(["", "*Le prospect est synchronisé dans Portalis et l'ERP.*"])
    
    return "\n".join(lines)


async def check_odoo_lead(lead_id: int) -> str:
    """Vérifie si un lead existe dans Odoo et retourne ses détails.
    
    Args:
        lead_id: ID du lead dans Odoo
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from app.services.prospect_sync import ProspectSyncService
        sync_service = ProspectSyncService()
        
        logger.info(f"[Check Odoo] Recherche lead ID: {lead_id}")
        odoo_data = await sync_service.get_odoo_lead(lead_id)
        
        if odoo_data:
            return (
                f"✅ Lead trouvé dans Odoo:\n"
                f"- ID: {lead_id}\n"
                f"- Nom: {odoo_data.get('name', 'N/A')}\n"
                f"- Contact: {odoo_data.get('contact_name', 'N/A')}\n"
                f"- Email: {odoo_data.get('email_from', 'N/A')}\n"
                f"- Type: {odoo_data.get('type', 'N/A')}\n"
                f"- Active: {odoo_data.get('active', 'N/A')}"
            )
        else:
            return f"❌ Lead ID {lead_id} non trouvé dans Odoo"
            
    except Exception as exc:
        logger.error(f"[Check Odoo] Erreur: {exc}")
        return f"❌ Erreur lors de la vérification: {exc}"


async def search_odoo_partner(name: str) -> str:
    """Recherche un client (res.partner) dans l'ERP Odoo par nom.

    Args:
        name: Nom du client/entreprise à rechercher
    """
    import logging
    import asyncio
    from app.infrastructure.odoo.client import OdooClient

    logger = logging.getLogger(__name__)
    logger.info(f"[AI Tool] Recherche client Odoo: {name}")

    try:
        oc = OdooClient()
        partners: list[dict] = await asyncio.to_thread(
            oc.execute,
            "res.partner",
            "search_read",
            [[("name", "ilike", name), ("is_company", "=", True)]],
            {"fields": ["id", "name", "email", "phone", "mobile", "street", "city", "country_id"], "limit": 5},
        )  # type: ignore[assignment]

        if not partners:
            return f"🔍 Aucun client trouvé dans l'ERP pour '{name}'"

        lines = [f"## 🔍 Clients trouvés dans l'ERP pour '{name}'", ""]
        for p in partners:
            lines.extend([
                f"### 🏢 {p.get('name')}",
                f"- **ID:** `{p.get('id')}`",
                f"- **Email:** {p.get('email') or 'N/A'}",
                f"- **Téléphone:** {p.get('phone') or p.get('mobile') or 'N/A'}",
                "",
            ])
        lines.append("*Utilisez l'ID pour assigner ce client à une opportunité.*")
        return "\n".join(lines)

    except Exception as exc:
        logger.error(f"[AI Tool] Erreur recherche client: {exc}")
        return f"❌ Erreur lors de la recherche: {exc}"


async def create_odoo_partner(
    name: str,
    email: str | None = None,
    phone: str | None = None,
    mobile: str | None = None,
    street: str | None = None,
    city: str | None = None,
    country_code: str | None = None,
) -> str:
    """Crée un nouveau client (res.partner) dans l'ERP Odoo.

    Args:
        name: Nom de l'entreprise (obligatoire)
        email: Email
        phone: Téléphone fixe
        mobile: Téléphone mobile
        street: Adresse
        city: Ville
        country_code: Code pays (ex: 'FR', 'SN')
    """
    import logging
    import asyncio
    from app.infrastructure.odoo.client import OdooClient

    logger = logging.getLogger(__name__)
    logger.info(f"[AI Tool] Création client Odoo: {name}")

    oc = OdooClient()
    values: dict = {"name": name, "is_company": True, "customer_rank": 1}
    if email:
        values["email"] = email
    if phone:
        values["phone"] = phone
    if mobile:
        values["mobile"] = mobile
    if street:
        values["street"] = street
    if city:
        values["city"] = city
    if country_code:
        try:
            countries: list[dict] = await asyncio.to_thread(
                oc.execute,
                "res.country",
                "search_read",
                [[("code", "=", country_code.upper())]],
                {"fields": ["id"], "limit": 1},
            )  # type: ignore[assignment]
            if countries:
                values["country_id"] = countries[0]["id"]
        except Exception as exc:
            logger.warning(f"[AI Tool] Résolution pays '{country_code}' échouée: {exc}")

    try:
        partner_id = await asyncio.to_thread(
            oc.execute,
            "res.partner",
            "create",
            [values],
        )
        logger.info(f"[AI Tool] Client Odoo créé avec ID: {partner_id}")
        return (
            f"✅ **Client créé dans l'ERP**\n\n"
            f"🏢 {name}\n"
            f"🆔 ID: `{partner_id}`\n\n"
            f"*Vous pouvez maintenant créer une opportunité avec ce client.*"
        )
    except Exception as exc:
        logger.error(f"[AI Tool] Erreur création client: {exc}")
        return f"❌ Erreur lors de la création du client: {exc}"


async def create_prospect_with_partner(
    company_name: str,
    partner_id: int,
    opportunity_name: str | None = None,
    contact_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    expected_revenue: int | None = None,
    sector: str | None = None,
    notes: str | None = None,
) -> str:
    """Crée une opportunité dans Portalis et Odoo avec un client assigné.
    
    Args:
        company_name: Nom de l'entreprise
        partner_id: ID du client (res.partner) dans Odoo
        opportunity_name: Titre de l'opportunité (défaut: company_name)
        contact_name: Nom du contact
        email: Email
        phone: Téléphone
        expected_revenue: CA prévu
        sector: Secteur
        notes: Notes
    """
    import logging
    from app.infrastructure.db.models.prospect import ProspectOrm
    from app.services.prospect_sync import ProspectSyncService
    
    logger = logging.getLogger(__name__)
    sync_service = ProspectSyncService()
    
    # Si pas de nom d'opportunité, utiliser le nom de l'entreprise
    lead_name = opportunity_name or company_name
    
    # 1. Créer dans Odoo avec le partner assigné
    logger.info(f"[AI Tool] Création lead Odoo: entreprise={company_name}, lead={lead_name}, partner_id={partner_id}")
    try:
        odoo_lead_id = await sync_service.create_in_odoo(
            name=lead_name,
            partner_name=company_name,
            contact_name=contact_name,
            email=email,
            phone=phone,
            user_id=None,
            team_id=None,
            expected_revenue=expected_revenue or 0,
            partner_id=partner_id,  # ← Lier au client existant
        )
        logger.info(f"[AI Tool] Lead Odoo créé avec ID: {odoo_lead_id}")
    except Exception as exc:
        logger.error(f"[AI Tool] Erreur création Odoo: {exc}")
        return f"❌ Erreur création dans l'ERP: {exc}"
    
    # 2. Construction des erp_metadata
    erp_metadata = {
        "id": odoo_lead_id,
        "name": lead_name,
        "partner_name": company_name,
        "type": "lead",
        "contact_name": contact_name,
        "email_from": email,
        "phone": phone,
        "expected_revenue": expected_revenue,
        "probability": None,
        "partner_id": partner_id,
        "user_id": None,
        "team_id": None,
    }
    
    # 3. Créer dans Portalis avec erp_metadata
    prospect = await ProspectOrm.create(
        portalis_sector=sector,
        portalis_notes=notes,
        status="nouveau",
        odoo_lead_id=odoo_lead_id,
        erp_metadata=erp_metadata,
    )
    
    return (
        f"✅ **Opportunité créée avec client assigné**\n\n"
        f"🏢 {company_name}\n"
        f"📋 Opportunité: {lead_name}\n"
        f"👤 Client ID: `{partner_id}`\n"
        f"🔗 ID ERP: `{odoo_lead_id}`\n"
        f"🆔 ID Portalis: `{prospect.id}`\n\n"
        f"*L'opportunité est liée au client dans l'ERP.*"
    )


# ── Registre ─────────────────────────────────────────────────────────────
# Nom snake_case → fonction async
# NOTE: Les opérations Odoo (search_records, create_record, etc.) sont gérées par le MCP Odoo

BUILTIN_REGISTRY: dict[str, object] = {
    "search_companies": search_companies,
    "get_company_details": get_company_details,
    "get_current_date": get_current_date,
    "list_prospects": list_prospects,
    "get_prospect_details": get_prospect_details,
    "create_prospect": create_prospect,
    "check_odoo_lead": check_odoo_lead,
    "search_odoo_partner": search_odoo_partner,
    "create_odoo_partner": create_odoo_partner,
    "create_prospect_with_partner": create_prospect_with_partner,
}
