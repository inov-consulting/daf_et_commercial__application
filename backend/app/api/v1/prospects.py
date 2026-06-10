"""Router API Prospects (CRM Commercial).

Architecture: Table prospects locale dans FastAPI + sync avec Odoo crm.lead.
Aucune modification Odoo requise.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentUser, require_permission
from app.api.v1.schemas.prospects import (
    ProspectAction,
    ProspectActionRequest,
    ProspectActivityOut,
    ProspectConvertOut,
    ProspectCreate,
    ProspectDetailOut,
    ProspectFilters,
    ProspectListOut,
    ProspectOut,
    ProspectStatus,
    ProspectStatusOut,
    ProspectStatusUpdate,
    ProspectUpdate,
    SyncStatusOut,
)
from app.core.logging import get_logger
from app.infrastructure.db.models.prospect import ProspectOrm, ProspectActivityOrm
from app.infrastructure.odoo.client import OdooClient
from app.services.prospect_sync import ProspectSyncService

logger = get_logger(__name__)

router = APIRouter(prefix="/commercial/prospects", tags=["prospects"])

_prospect_deps = [Depends(require_permission("prospects:read"))]
_prospect_write_deps = [Depends(require_permission("prospects:write"))]


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════


def _format_prospect_status(status: ProspectStatus) -> str:
    """Label FR pour les statuts."""
    labels = {
        ProspectStatus.NOUVEAU: "Nouveau",
        ProspectStatus.CONTACTE: "Contacté",
        ProspectStatus.QUALIFIE: "Qualifié",
        ProspectStatus.CONVERTI: "Converti",
        ProspectStatus.PERDU: "Perdu",
    }
    return labels.get(status, status.value)


def _compute_pipeline_age_days(prospect: ProspectOrm) -> int:
    """Calcule l'âge dans le statut actuel."""
    from datetime import datetime

    if not prospect.status_changed_at:
        return 0
    return (datetime.utcnow() - prospect.status_changed_at).days


async def _enrich_prospect(prospect: ProspectOrm) -> dict:
    """Enrichit un prospect avec données Odoo.

    Merge données Portalis (DB) + Odoo (API).
    """
    sync_service = ProspectSyncService()
    odoo_result = await sync_service.sync_single_prospect(prospect)

    odoo_data = odoo_result.get("odoo_data", {})

    # Résolution noms (user, team, tags)
    assigned_to_name = None
    team_name = None
    odoo_tags = []

    if odoo_data.get("user_id"):
        try:
            import asyncio
            oc = OdooClient()
            users = await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "res.users",
                "search_read",
                [[("id", "=", odoo_data["user_id"][0])]],
                {"fields": ["name"], "limit": 1},
            )
            if users:
                assigned_to_name = users[0].get("name")
        except Exception:
            pass

    if odoo_data.get("team_id"):
        try:
            import asyncio
            oc = OdooClient()
            teams = await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.team",
                "search_read",
                [[("id", "=", odoo_data["team_id"][0])]],
                {"fields": ["name"], "limit": 1},
            )
            if teams:
                team_name = teams[0].get("name")
        except Exception:
            pass

    # Tags Odoo
    if odoo_data.get("tag_ids"):
        try:
            import asyncio
            oc = OdooClient()
            tags = await asyncio.to_thread(
                oc._object_proxy().execute_kw,
                oc._db,
                oc._authenticate(),
                oc._password,
                "crm.tag",
                "search_read",
                [[("id", "in", odoo_data["tag_ids"])]],
                {"fields": ["name"], "limit": len(odoo_data["tag_ids"])},
            )
            odoo_tags = [t.get("name") for t in tags]
        except Exception:
            pass

    return {
        # Identifiants
        "id": prospect.id,
        "odoo_lead_id": prospect.odoo_lead_id,
        # Portalis
        "status": prospect.status,
        "status_label": _format_prospect_status(prospect.status),
        "portalis_sector": prospect.portalis_sector,
        "portalis_notes": prospect.portalis_notes,
        "status_changed_at": prospect.status_changed_at,
        "pipeline_age_days": _compute_pipeline_age_days(prospect),
        # Odoo
        "company_name": odoo_data.get("name", "N/A"),
        "contact_name": odoo_data.get("contact_name"),
        "email": odoo_data.get("email_from"),
        "phone": odoo_data.get("phone") or odoo_data.get("mobile"),
        "assigned_to_id": odoo_data.get("user_id", [None])[0] if odoo_data.get("user_id") else None,
        "assigned_to_name": assigned_to_name,
        "team_id": odoo_data.get("team_id", [None])[0] if odoo_data.get("team_id") else None,
        "team_name": team_name,
        "expected_revenue": int(odoo_data.get("expected_revenue", 0) or 0),
        "probability": int(odoo_data.get("probability", 0) or 0),
        "priority": odoo_data.get("priority"),
        "odoo_tags": odoo_tags,
        # Métadonnées
        "created_at": prospect.created_at,
        "updated_at": prospect.updated_at,
        "last_sync_at": prospect.last_sync_at,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("", dependencies=_prospect_deps)
async def list_prospects(
    filters: Annotated[ProspectFilters, Depends()],
) -> ProspectListOut:
    """Liste paginée des prospects avec filtres et agrégations."""

    # Compteurs par statut pour agrégation
    status_counts = {}
    for status_enum in ProspectStatus:
        count = await ProspectOrm.filter(status=status_enum.value).count()
        status_counts[status_enum.value] = count

    # Total pipeline value (nécessite sync avec Odoo pour données fraîches)
    # Pour l'instant on retourne 0, calcul côté client ou endpoint dédié
    total_pipeline = 0

    # Pagination avec filtres
    query = ProspectOrm.all()
    if filters.status:
        query = query.filter(status=filters.status)

    total = await query.count()
    prospects = await query.offset(filters.offset).limit(filters.limit).all()

    # Enrichissement (TODO: batch pour performance)
    items = []
    for p in prospects:
        enriched = await _enrich_prospect(p)
        items.append(ProspectOut(**enriched))
        total_pipeline += enriched.get("expected_revenue", 0)

    return ProspectListOut(
        items=items,
        total=total,
        limit=filters.limit,
        offset=filters.offset,
        by_status=ProspectStatusOut(**status_counts),
        total_pipeline_value=total_pipeline,
    )


@router.post("", dependencies=_prospect_write_deps, status_code=status.HTTP_201_CREATED)
async def create_prospect(
    user: CurrentUser,
    payload: ProspectCreate,
) -> ProspectOut:
    """Crée un nouveau prospect (dans Portalis + Odoo)."""

    sync_service = ProspectSyncService()

    # 1. Création dans Odoo
    tag_ids = None  # TODO: mapping sector → tag_ids
    odoo_lead_id = await sync_service.create_in_odoo(
        name=payload.company_name,
        contact_name=payload.contact_name,
        email=payload.email,
        phone=payload.phone,
        user_id=payload.user_id,
        team_id=payload.team_id,
        expected_revenue=payload.expected_revenue,
        tag_ids=tag_ids,
    )

    # 2. Création dans Portalis
    prospect = await ProspectOrm.create(
        odoo_lead_id=odoo_lead_id,
        status="nouveau",
        portalis_sector=payload.portalis_sector,
        created_by=user.id,
    )

    # 3. Log activité
    await ProspectActivityOrm.create(
        prospect_id=prospect.id,
        activity_type="created",
        description=f"Prospect créé par {user.email}",
        performed_by=user.id,
    )

    # 4. Retour enrichi
    enriched = await _enrich_prospect(prospect)
    return ProspectOut(**enriched)


@router.get("/{prospect_id}", dependencies=_prospect_deps)
async def get_prospect(
    prospect_id: UUID,
) -> ProspectDetailOut:
    """Détail prospect avec historique."""

    prospect = await ProspectOrm.get_or_none(id=prospect_id)

    if not prospect:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prospect non trouvé")

    # Enrichissement
    enriched = await _enrich_prospect(prospect)

    # Historique activités
    activities = await ProspectActivityOrm.filter(
        prospect_id=prospect_id
    ).order_by("-created_at").all()

    enriched["activities"] = [
        ProspectActivityOut(
            id=a.id,
            activity_type=a.activity_type,
            description=a.description,
            performed_by=a.performed_by,
            performed_by_name=None,  # TODO: resolve user name
            created_at=a.created_at,
        )
        for a in activities
    ]

    return ProspectDetailOut(**enriched)


@router.patch("/{prospect_id}", dependencies=_prospect_write_deps)
async def update_prospect(
    user: CurrentUser,
    prospect_id: UUID,
    payload: ProspectUpdate,
) -> ProspectOut:
    """Mise à jour prospect (champs Portalis + Odoo natifs)."""

    prospect = await ProspectOrm.get_or_none(id=prospect_id)

    if not prospect:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prospect non trouvé")

    # 1. Mise à jour champs Portalis
    if payload.portalis_sector is not None:
        prospect.portalis_sector = payload.portalis_sector
    if payload.portalis_notes is not None:
        prospect.portalis_notes = payload.portalis_notes
    await prospect.save()

    # 2. Mise à jour champs Odoo natifs
    odoo_values = {}
    if payload.company_name is not None:
        odoo_values["name"] = payload.company_name
    if payload.contact_name is not None:
        odoo_values["contact_name"] = payload.contact_name
    if payload.email is not None:
        odoo_values["email_from"] = payload.email
    if payload.phone is not None:
        odoo_values["phone"] = payload.phone
    if payload.user_id is not None:
        odoo_values["user_id"] = payload.user_id
    if payload.team_id is not None:
        odoo_values["team_id"] = payload.team_id
    if payload.expected_revenue is not None:
        odoo_values["expected_revenue"] = payload.expected_revenue

    if odoo_values:
        sync_service = ProspectSyncService()
        success = await sync_service.update_in_odoo(prospect.odoo_lead_id, odoo_values)
        if not success:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Erreur mise à jour Odoo",
            )

    # Log activité
    await ProspectActivityOrm.create(
        prospect_id=prospect.id,
        activity_type="updated",
        description="Mise à jour prospect",
        performed_by=user.id,
    )

    enriched = await _enrich_prospect(prospect)
    return ProspectOut(**enriched)


# ═══════════════════════════════════════════════════════════════════════════════
# Actions Pipeline (Transitions)
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/{prospect_id}/actions", dependencies=_prospect_write_deps)
async def execute_action(
    user: CurrentUser,
    prospect_id: UUID,
    payload: ProspectActionRequest,
) -> ProspectOut | ProspectConvertOut:
    """Exécute une action sur le prospect (contact, qualify, convert, lose).

    Exemple: {"action": "qualify"} ou {"action": "lose", "lost_reason_id": 1}
    """

    prospect = await ProspectOrm.get_or_none(id=prospect_id)

    if not prospect:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prospect non trouvé")

    sync_service = ProspectSyncService()

    match payload.action:
        case ProspectAction.CONTACT:
            prospect.status = "contacte"
            await prospect.save()
            await ProspectActivityOrm.create(
                prospect_id=prospect.id,
                activity_type="status_change",
                description="Passé en statut 'Contacté'",
                performed_by=user.id,
            )

        case ProspectAction.QUALIFY:
            prospect.status = "qualifie"
            await prospect.save()
            await ProspectActivityOrm.create(
                prospect_id=prospect.id,
                activity_type="status_change",
                description="Passé en statut 'Qualifié'",
                performed_by=user.id,
            )

        case ProspectAction.CONVERT:
            convert_result = await sync_service.convert_in_odoo(prospect.odoo_lead_id)
            if not convert_result.get("success"):
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    f"Erreur conversion Odoo: {convert_result.get('error')}",
                )
            prospect.status = "converti"
            await prospect.save()
            await ProspectActivityOrm.create(
                prospect_id=prospect.id,
                activity_type="converted",
                description="Prospect converti en opportunité/client",
                performed_by=user.id,
            )
            enriched = await _enrich_prospect(prospect)
            return ProspectConvertOut(
                prospect=ProspectOut(**enriched),
                odoo_opportunity_id=convert_result.get("odoo_opportunity_id"),
                odoo_partner_id=convert_result.get("odoo_partner_id"),
                message="Prospect converti avec succès",
            )

        case ProspectAction.LOSE:
            success = await sync_service.mark_lost_in_odoo(
                prospect.odoo_lead_id,
                payload.lost_reason_id,
                payload.custom_reason,
            )
            if not success:
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "Erreur mise à jour Odoo",
                )
            prospect.status = "perdu"
            await prospect.save()
            reason_text = payload.custom_reason or f"Raison ID {payload.lost_reason_id}"
            await ProspectActivityOrm.create(
                prospect_id=prospect.id,
                activity_type="status_change",
                description=f"Prospect marqué perdu: {reason_text}",
                performed_by=user.id,
            )

        case _:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Action non supportée: {payload.action}")

    enriched = await _enrich_prospect(prospect)
    return ProspectOut(**enriched)


# ═══════════════════════════════════════════════════════════════════════════════
# Sync & Admin
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/sync", dependencies=[Depends(require_permission("prospects:admin"))])
async def trigger_sync(
    full_sync: bool = False,
) -> SyncStatusOut:
    """Déclenche manuellement la synchronisation avec Odoo."""

    sync_service = ProspectSyncService()
    result = await sync_service.sync_all_prospects(full_sync=full_sync)

    return SyncStatusOut(
        last_sync_at=None,  # Mis à jour par la sync
        synced_count=result.get("updated", 0),
        pending_sync_count=0,
        errors=result.get("errors", []),
    )
