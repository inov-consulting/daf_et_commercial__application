"""Service de synchronisation Prospects Portalis ↔ Odoo.

Gère le sync bidirectionnel:
- Portalis → Odoo: création, modifications champs natifs
- Odoo → Portalis: enrichissement données, détection conversions
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from tortoise.expressions import Q

from app.core.logging import get_logger
from app.infrastructure.db.models.prospect import ProspectOrm
from app.infrastructure.odoo.client import OdooClient

logger = get_logger(__name__)

# Champs Odoo crm.lead qu'on synchronise
ODOO_LEAD_FIELDS = [
    "active",  # False = archivé (perdu) dans Odoo
    "id",
    "name",  # Nom de l'opportunité/lead
    "stage_id",  # Étape du pipeline Odoo
    "partner_name",  # Nom de l'entreprise/client
    "contact_name",
    "email_from",
    "phone",
    # "mobile",  # Champ non présent dans cette version Odoo
    "partner_id",  # res.partner lié
    "user_id",  # Commercial assigné
    "team_id",  # Équipe
    "expected_revenue",
    "probability",
    "priority",
    "tag_ids",  # Secteurs/tags
    "create_date",
    "write_date",
    "type",  # 'lead' ou 'opportunity'
]


class ProspectSyncService:
    """Service de sync Celery pour les prospects."""
    
    # Cache d'instance OdooClient pour éviter de se réauthentifier à chaque appel
    _odoo_client: OdooClient | None = None
    
    def _get_odoo_client(self) -> OdooClient:
        """Récupère ou crée une instance OdooClient (avec cache)."""
        if ProspectSyncService._odoo_client is None:
            ProspectSyncService._odoo_client = OdooClient()
            logger.info("[Sync] Nouveau client Odoo créé (authentification cache)")
        return ProspectSyncService._odoo_client

    async def sync_all_prospects(self, full_sync: bool = False) -> dict[str, Any]:
        """Synchronise tous les prospects avec Odoo.

        Args:
            full_sync: Si True, récupère tous les leads Odoo.
                      Si False, uniquement ceux modifiés depuis last_sync.

        Returns:
            Rapport de synchronisation.
        """
        result = {"created": 0, "updated": 0, "errors": [], "skipped": 0}

        # Récupère les prospects Portalis
        portalis_prospects = await ProspectOrm.all()

        odoo_ids = [p.odoo_lead_id for p in portalis_prospects]

        if not odoo_ids:
            logger.info("[Sync] Aucun prospect à synchroniser")
            return result

        # Query Odoo pour les leads correspondants
        try:
            import asyncio
            oc = self._get_odoo_client()
            odoo_leads = await asyncio.to_thread(
                oc.execute,
                "crm.lead", "search_read",
                [[("id", "in", odoo_ids), ("active", "in", [True, False])]],
                {"fields": ODOO_LEAD_FIELDS, "limit": len(odoo_ids)},
            )

            odoo_by_id = {lead["id"]: lead for lead in odoo_leads}

            for prospect in portalis_prospects:
                odoo_data = odoo_by_id.get(prospect.odoo_lead_id)

                if not odoo_data:
                    # Lead supprimé dans Odoo
                    logger.warning(
                        f"[Sync] Lead Odoo {prospect.odoo_lead_id} introuvable"
                    )
                    result["skipped"] += 1
                    continue

                # Détection conversion automatique
                if odoo_data.get("type") == "opportunity" and prospect.status != "converti":
                    logger.info(f"[Sync] Auto-conversion prospect {prospect.id}")
                    prospect.status = "converti"
                    prospect.status_changed_at = datetime.utcnow()
                    result["updated"] += 1

                prospect.last_sync_at = datetime.utcnow()
                await prospect.save()

        except Exception as exc:
            logger.exception("[Sync] Erreur synchronisation Odoo")
            result["errors"].append(str(exc))

        return result

    async def get_odoo_leads_batch(self, lead_ids: list[int]) -> dict[int, dict[str, Any]]:
        """Récupère plusieurs leads Odoo en une seule requête.
        
        Args:
            lead_ids: Liste des IDs de leads à récupérer.
            
        Returns:
            Dict mapping lead_id -> données Odoo.
        """
        if not lead_ids:
            return {}
        
        try:
            import asyncio
            oc = self._get_odoo_client()
            leads = await asyncio.to_thread(
                oc.execute, "crm.lead", "search_read",
                [[("id", "in", lead_ids), ("active", "in", [True, False])]],
                {"fields": ODOO_LEAD_FIELDS, "limit": len(lead_ids)},
            )
            
            # Mapper par ID pour accès rapide
            return {lead["id"]: lead for lead in leads}
            
        except Exception as exc:
            logger.exception(f"[Sync] Erreur batch fetch leads: {lead_ids}")
            return {}

    async def sync_single_prospect(self, prospect: ProspectOrm) -> dict[str, Any]:
        """Synchronise un prospect spécifique avec Odoo.

        Args:
            prospect: Instance Prospect à synchroniser.

        Returns:
            Données Odoo fraîches.
        """
        try:
            import asyncio
            oc = self._get_odoo_client()
            leads = await asyncio.to_thread(
                oc.execute, "crm.lead", "search_read",
                [[("id", "=", prospect.odoo_lead_id), ("active", "in", [True, False])]],
                {"fields": ODOO_LEAD_FIELDS, "limit": 1},
            )

            if not leads:
                raise ValueError(f"Lead Odoo {prospect.odoo_lead_id} introuvable")

            odoo_data = leads[0]
            prospect.last_sync_at = datetime.now(timezone.utc)
            prospect.erp_metadata = odoo_data
            await prospect.save()

            return {"success": True, "odoo_data": odoo_data}

        except Exception as exc:
            logger.exception(f"[Sync] Erreur sync prospect {prospect.id}")
            return {"success": False, "error": str(exc)}

    async def search_lead_by_name(self, name: str) -> list[dict[str, Any]]:
        """Recherche des leads Odoo par nom (approximatif).
        
        Args:
            name: Nom/pattern à rechercher.
            
        Returns:
            Liste des leads correspondants avec leurs champs.
        """
        try:
            import asyncio
            oc = self._get_odoo_client()
            leads = await asyncio.to_thread(
                oc.execute, "crm.lead", "search_read",
                [[("name", "ilike", name)]],
                {"fields": ODOO_LEAD_FIELDS, "limit": 10},
            )
            logger.info(f"[Sync] Recherche leads Odoo par '{name}': {len(leads)} trouvé(s)")
            return leads
        except Exception as exc:
            logger.exception(f"[Sync] Erreur recherche leads Odoo pour '{name}'")
            return []

    async def create_in_odoo(
        self,
        name: str,
        contact_name: str | None,
        email: str | None,
        phone: str | None,
        user_id: int | None,
        team_id: int | None,
        expected_revenue: int,
        tag_ids: list[int] | None = None,
        partner_id: int | None = None,
        partner_name: str | None = None,
        lead_type: str = "lead",
        probability: float | None = None,
        date_deadline: str | None = None,
        erp_company_id: int | None = None,
    ) -> int:
        """Crée un lead ou opportunité dans Odoo et retourne son ID.
        
        Args:
            partner_id: ID du client/entreprise existant (res.partner) à lier.
            partner_name: Nom de l'entreprise (affiché dans le lead).
            lead_type: 'lead' ou 'opportunity'.
            probability: Probabilité de conversion (0-100) pour opportunités.
            date_deadline: Date butoir (format YYYY-MM-DD).

        Returns:
            ID Odoo du lead/opportunité créé(e).
        """
        # Ne pas envoyer les valeurs None à XML-RPC (allow_none non activé)
        values: dict[str, Any] = {
            "name": name,
            "type": lead_type,
            "active": True,  # Garantit la visibilité dans Odoo (non archivé)
        }
        
        if partner_name:
            values["partner_name"] = partner_name
        if contact_name:
            values["contact_name"] = contact_name
        if email:
            values["email_from"] = email
        if phone:
            values["phone"] = phone
        if user_id:
            values["user_id"] = user_id
        if team_id:
            values["team_id"] = team_id
        if expected_revenue:
            values["expected_revenue"] = expected_revenue
        if tag_ids:
            values["tag_ids"] = [(6, 0, tag_ids)]
        if partner_id:
            values["partner_id"] = partner_id
        if probability is not None:
            values["probability"] = probability
        if date_deadline:
            values["date_deadline"] = date_deadline
        if erp_company_id:
            values["company_id"] = erp_company_id

        try:
            import asyncio
            oc = self._get_odoo_client()

            logger.info(f"[Sync] Création {lead_type} dans Odoo avec values: {values}")

            lead_id = await asyncio.to_thread(oc.execute, "crm.lead", "create", [values])

            type_label = "Opportunité" if lead_type == "opportunity" else "Lead"
            logger.info(f"[Sync] {type_label} Odoo créé(e) avec ID: {lead_id}")
            return lead_id

        except Exception as exc:
            type_label = "opportunité" if lead_type == "opportunity" else "lead"
            logger.exception(f"[Sync] Erreur création {type_label} Odoo")
            raise

    async def create_partner_in_odoo(
        self,
        name: str,
        email: str | None = None,
        phone: str | None = None,
        is_company: bool = True,
        erp_company_id: int | None = None,
    ) -> int:
        """Crée un client/entreprise (res.partner) dans Odoo.

        Args:
            name: Nom du client/entreprise.
            email: Email.
            phone: Téléphone.
            is_company: True si c'est une entreprise, False pour un particulier.

        Returns:
            ID du partner créé.
        """
        values: dict[str, Any] = {
            "name": name,
            "is_company": is_company,
            "company_type": "company" if is_company else "person",
        }
        if email:
            values["email"] = email
        if phone:
            values["phone"] = phone
        if erp_company_id:
            values["company_id"] = erp_company_id

        try:
            import asyncio
            oc = self._get_odoo_client()

            logger.info(f"[Sync] Création partner dans Odoo: {values}")
            
            partner_id = await asyncio.to_thread(
                oc.execute, "res.partner", "create", [values],
            )
            
            logger.info(f"[Sync] Partner Odoo créé: {partner_id} ({name})")
            return partner_id

        except Exception as exc:
            logger.exception(f"[Sync] Erreur création partner Odoo pour {name}")
            raise

    async def update_in_odoo(self, odoo_lead_id: int, values: dict) -> bool:
        """Met à jour un lead dans Odoo.

        Args:
            odoo_lead_id: ID du lead Odoo.
            values: Champs à modifier (format Odoo).

        Returns:
            True si succès.

        Raises:
            LookupError: Le lead n'existe plus dans l'ERP (supprimé côté Odoo).
        """
        import asyncio
        import xmlrpc.client

        try:
            oc = self._get_odoo_client()
            await asyncio.to_thread(
                oc.execute, "crm.lead", "write", [[odoo_lead_id], values],
            )
            logger.info(f"[Sync] Lead Odoo {odoo_lead_id} mis à jour")
            return True

        except xmlrpc.client.Fault as exc:
            if exc.faultCode == 2:
                logger.warning(
                    f"[Sync] Lead Odoo {odoo_lead_id} introuvable — sera supprimé de Portalis"
                )
                raise LookupError(str(odoo_lead_id)) from exc
            logger.exception(f"[Sync] Erreur Odoo update lead {odoo_lead_id}")
            return False

        except Exception:
            logger.exception(f"[Sync] Erreur update lead Odoo {odoo_lead_id}")
            return False

    async def convert_in_odoo(self, odoo_lead_id: int) -> dict[str, Any]:
        """Convertit un lead en opportunité/client dans Odoo.

        Utilise le wizard crm.lead2opportunity.partner.

        Returns:
            IDs créés (opportunity_id, partner_id).

        Raises:
            LookupError: Le lead n'existe plus dans l'ERP (supprimé côté Odoo).
        """
        import asyncio
        import xmlrpc.client

        try:
            oc = self._get_odoo_client()
            await asyncio.to_thread(
                oc.execute, "crm.lead", "action_set_won", [[odoo_lead_id]],
            )

            # Relecture pour récupérer les IDs créés
            lead_data = await asyncio.to_thread(
                oc.execute, "crm.lead", "search_read",
                [[("id", "=", odoo_lead_id)]],
                {"fields": ["partner_id", "type"], "limit": 1},
            )

            if lead_data:
                partner_id = lead_data[0].get("partner_id", [None])[0]
                return {
                    "success": True,
                    "odoo_opportunity_id": odoo_lead_id,
                    "odoo_partner_id": partner_id,
                }

            return {"success": True, "message": "Converti (IDs non récupérés)"}

        except xmlrpc.client.Fault as exc:
            if exc.faultCode == 2:
                logger.warning(
                    f"[Sync] Lead Odoo {odoo_lead_id} introuvable — sera supprimé de Portalis"
                )
                raise LookupError(str(odoo_lead_id)) from exc
            logger.exception(f"[Sync] Erreur Odoo conversion lead {odoo_lead_id}")
            return {"success": False, "error": str(exc)}

        except Exception as exc:
            logger.exception(f"[Sync] Erreur conversion lead {odoo_lead_id}")
            return {"success": False, "error": str(exc)}

    async def mark_lost_in_odoo(
        self, odoo_lead_id: int, lost_reason_id: int | None, custom_reason: str | None
    ) -> bool:
        """Marque un lead comme perdu dans Odoo.

        Args:
            odoo_lead_id: ID du lead.
            lost_reason_id: ID crm.lost.reason (optionnel).
            custom_reason: Motif texte si pas d'ID.

        Raises:
            LookupError: Le lead n'existe plus dans l'ERP (supprimé côté Odoo).
        """
        import asyncio
        import xmlrpc.client

        try:
            values: dict = {"active": False}
            if lost_reason_id:
                values["lost_reason_id"] = lost_reason_id

            oc = self._get_odoo_client()
            await asyncio.to_thread(
                oc.execute, "crm.lead", "write", [[odoo_lead_id], values],
            )
            logger.info(f"[Sync] Lead Odoo {odoo_lead_id} marqué perdu")
            return True

        except xmlrpc.client.Fault as exc:
            if exc.faultCode == 2:
                logger.warning(
                    f"[Sync] Lead Odoo {odoo_lead_id} introuvable — sera supprimé de Portalis"
                )
                raise LookupError(str(odoo_lead_id)) from exc
            logger.exception(f"[Sync] Erreur Odoo perte lead {odoo_lead_id}")
            return False

        except Exception:
            logger.exception(f"[Sync] Erreur perte lead {odoo_lead_id}")
            return False


async def run_periodic_sync() -> dict[str, Any]:
    """Tâche Celery périodique de synchronisation.

    Usage: celery beat toutes les 5 minutes.
    """
    service = ProspectSyncService()
    return await service.sync_all_prospects(full_sync=False)
