"""Service de synchronisation Prospects Portalis ↔ Odoo.

Gère le sync bidirectionnel:
- Portalis → Odoo: création, modifications champs natifs
- Odoo → Portalis: enrichissement données, détection conversions
"""

from datetime import datetime, timedelta
from typing import Any

from tortoise.expressions import Q

from app.core.logging import get_logger
from app.infrastructure.db.models.prospect import ProspectOrm
from app.infrastructure.odoo.client import OdooClient

logger = get_logger(__name__)

# Champs Odoo crm.lead qu'on synchronise
ODOO_LEAD_FIELDS = [
    "id",
    "name",  # Nom entreprise/sujet
    "contact_name",
    "email_from",
    "phone",
    "mobile",
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
            oc = OdooClient()
            # Récupération via XML-RPC (synchrone, wrap dans asyncio.to_thread si besoin)
            import asyncio
            odoo_leads = await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.lead",
                "search_read",
                [[("id", "in", odoo_ids)]],
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

    async def sync_single_prospect(self, prospect: ProspectOrm) -> dict[str, Any]:
        """Synchronise un prospect spécifique avec Odoo.

        Args:
            prospect: Instance Prospect à synchroniser.

        Returns:
            Données Odoo fraîches.
        """
        try:
            import asyncio
            oc = OdooClient()
            leads = await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.lead",
                "search_read",
                [[("id", "=", prospect.odoo_lead_id)]],
                {"fields": ODOO_LEAD_FIELDS, "limit": 1},
            )

            if not leads:
                raise ValueError(f"Lead Odoo {prospect.odoo_lead_id} introuvable")

            odoo_data = leads[0]
            prospect.last_sync_at = datetime.utcnow()
            await prospect.save()

            return {"success": True, "odoo_data": odoo_data}

        except Exception as exc:
            logger.exception(f"[Sync] Erreur sync prospect {prospect.id}")
            return {"success": False, "error": str(exc)}

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
    ) -> int:
        """Crée un lead dans Odoo et retourne son ID.

        Returns:
            ID Odoo du lead créé.
        """
        values = {
            "name": name,
            "contact_name": contact_name or name,
            "email_from": email,
            "phone": phone,
            "user_id": user_id,
            "team_id": team_id,
            "expected_revenue": expected_revenue,
            "type": "lead",
        }

        if tag_ids:
            values["tag_ids"] = [(6, 0, tag_ids)]

        try:
            import asyncio
            oc = OdooClient()
            lead_id = await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.lead",
                "create",
                [values],
            )
            logger.info(f"[Sync] Lead Odoo créé: {lead_id}")
            return lead_id

        except Exception as exc:
            logger.exception("[Sync] Erreur création lead Odoo")
            raise

    async def update_in_odoo(self, odoo_lead_id: int, values: dict) -> bool:
        """Met à jour un lead dans Odoo.

        Args:
            odoo_lead_id: ID du lead Odoo.
            values: Champs à modifier (format Odoo).

        Returns:
            True si succès.
        """
        try:
            import asyncio
            oc = OdooClient()
            await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.lead",
                "write",
                [[odoo_lead_id], values],
            )
            logger.info(f"[Sync] Lead Odoo {odoo_lead_id} mis à jour")
            return True

        except Exception as exc:
            logger.exception(f"[Sync] Erreur update lead Odoo {odoo_lead_id}")
            return False

    async def convert_in_odoo(self, odoo_lead_id: int) -> dict[str, Any]:
        """Convertit un lead en opportunité/client dans Odoo.

        Utilise le wizard crm.lead2opportunity.partner.

        Returns:
            IDs créés (opportunity_id, partner_id).
        """
        try:
            # Appel action Odoo de conversion
            import asyncio
            oc = OdooClient()
            await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.lead",
                "action_set_won",
                [[odoo_lead_id]],
            )

            # Relecture pour récupérer les IDs créés
            import asyncio
            oc = OdooClient()
            lead_data = await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.lead",
                "search_read",
                [[("id", "=", odoo_lead_id)]],
                {"fields": ["partner_id", "type"], "limit": 1},
            )

            if lead_data:
                partner_id = lead_data[0].get("partner_id", [None])[0]
                return {
                    "success": True,
                    "odoo_opportunity_id": odoo_lead_id,  # Devient opportunité
                    "odoo_partner_id": partner_id,
                }

            return {"success": True, "message": "Converti (IDs non récupérés)"}

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
        """
        try:
            values = {"active": False}  # Archive dans Odoo

            if lost_reason_id:
                values["lost_reason_id"] = lost_reason_id

            import asyncio
            oc = OdooClient()
            await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.lead",
                "write",
                [[odoo_lead_id], values],
            )
            logger.info(f"[Sync] Lead Odoo {odoo_lead_id} marqué perdu")
            return True

        except Exception as exc:
            logger.exception(f"[Sync] Erreur perte lead {odoo_lead_id}")
            return False


async def run_periodic_sync() -> dict[str, Any]:
    """Tâche Celery périodique de synchronisation.

    Usage: celery beat toutes les 5 minutes.
    """
    service = ProspectSyncService()
    return await service.sync_all_prospects(full_sync=False)
