"""Router API Prospects (CRM Commercial).

Architecture: Table prospects locale dans FastAPI + sync avec Odoo crm.lead.
Aucune modification Odoo requise.
"""

from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentUser, require_permission
from app.api.v1.schemas.prospects import (
    CompteRenduGenerate,
    CompteRenduListOut,
    CompteRenduOut,
    NoteCreate,
    NoteListOut,
    NoteOut,
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
    ProspectStatusValueOut,
    ProspectStatusUpdate,
    ProspectUpdate,
    SyncStatusOut,
)
from app.core.logging import get_logger
from app.infrastructure.db.models.note import CompteRenduOrm, NoteOrm
from app.infrastructure.db.models.prospect import ProspectActivityOrm, ProspectOrm
from app.infrastructure.odoo.client import OdooClient
from app.services.prospect_sync import ProspectSyncService

logger = get_logger(__name__)

router = APIRouter(prefix="/commercial/prospects", tags=["prospects"])

_prospect_deps = [Depends(require_permission("prospects:read"))]
_prospect_write_deps = [Depends(require_permission("prospects:write"))]


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════


def _format_prospect_status(status: str | ProspectStatus) -> str:
    """Label FR pour les statuts.
    
    Accepte soit un ProspectStatus enum soit une string (depuis la DB).
    """
    # Mapping des valeurs string vers labels
    labels = {
        "nouveau": "Nouveau",
        "contacte": "Contacté",
        "qualifie": "Qualifié",
        "converti": "Converti",
        "perdu": "Perdu",
    }
    
    # Si c'est un enum, on prend sa value
    if isinstance(status, ProspectStatus):
        return labels.get(status.value, status.value)
    
    # Sinon c'est déjà une string
    return labels.get(status, status)


def _compute_pipeline_age_days(prospect: ProspectOrm) -> int:
    """Calcule l'âge dans le statut actuel."""
    from datetime import datetime

    if not prospect.status_changed_at:
        return 0
    return (datetime.utcnow() - prospect.status_changed_at).days


# Cache global pour éviter de recréer le service à chaque appel
_sync_service_cache: ProspectSyncService | None = None


def _get_sync_service() -> ProspectSyncService:
    """Récupère ou crée une instance cachée de ProspectSyncService."""
    global _sync_service_cache
    if _sync_service_cache is None:
        _sync_service_cache = ProspectSyncService()
    return _sync_service_cache


async def _enrich_prospect(prospect: ProspectOrm, force_refresh: bool = False) -> dict:
    """Enrichit un prospect avec données Odoo.

    Merge données Portalis (DB) + Odoo (API).
    Utilise erp_metadata si disponible et à jour, sauf si force_refresh=True.
    """
    # Si erp_metadata existe et qu'on ne force pas le refresh, l'utiliser directement
    if not force_refresh and prospect.erp_metadata:
        odoo_data = prospect.erp_metadata
        # Pas besoin de résoudre les noms - on utilise les données locales
        assigned_to_name = None
        team_name = None
        odoo_tags = []
    else:
        # Sinon, récupérer depuis Odoo
        sync_service = _get_sync_service()
        odoo_result = await sync_service.sync_single_prospect(prospect)
        odoo_data = odoo_result.get("odoo_data", {})

        # Résolution noms (user, team, tags) - seulement si on a appelé Odoo
        assigned_to_name = None
        team_name = None
        odoo_tags = []

        # Utiliser le cache du service pour éviter ré-authentification
        oc = sync_service._get_odoo_client()
        
        if odoo_data.get("user_id"):
            try:
                import asyncio
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

    # Helper pour nettoyer les valeurs Odoo (False -> None)
    def _clean(val: Any) -> Any:
        if val is False:
            return None
        return val

    return {
        # Identifiants
        "id": prospect.id,
        "odoo_lead_id": prospect.odoo_lead_id,
        # Portalis
        "status": prospect.status,
        "status_label": _format_prospect_status(prospect.status),
        "portalis_sector": _clean(prospect.portalis_sector),
        "portalis_notes": _clean(prospect.portalis_notes),
        "status_changed_at": prospect.status_changed_at,
        "pipeline_age_days": _compute_pipeline_age_days(prospect),
        # Odoo
        "company_name": odoo_data.get("name") or "N/A",
        "contact_name": _clean(odoo_data.get("contact_name")),
        "email": _clean(odoo_data.get("email_from")),
        "phone": _clean(odoo_data.get("phone")),
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
    enrich: Annotated[bool, Query(description="Enrichir avec données Odoo (plus lent)")] = False,
) -> ProspectListOut:
    """Liste paginée des prospects avec filtres et agrégations.
    
    Args:
        filters: Filtres de pagination et statut
        enrich: Si True, récupère les données fraîches d'Odoo (plus lent, défaut: False)
    """

    # Compteurs par statut pour agrégation
    status_counts = {}
    for status_enum in ProspectStatus:
        count = await ProspectOrm.filter(status=status_enum.value).count()
        status_counts[status_enum.value] = count

    # Total pipeline value
    total_pipeline = Decimal("0")

    # Pagination avec filtres
    query = ProspectOrm.all()
    if filters.status:
        query = query.filter(status=filters.status)

    total = await query.count()
    prospects = await query.offset(filters.offset).limit(filters.limit).all()

    # Enrichissement optionnel (une seule fois par prospect)
    items = []
    status_values = {
        "nouveau": Decimal("0"),
        "contacte": Decimal("0"),
        "qualifie": Decimal("0"),
        "converti": Decimal("0"),
        "perdu": Decimal("0"),
    }
    
    for p in prospects:
        if enrich:
            enriched = await _enrich_prospect(p)
            items.append(ProspectOut(**enriched))
            revenue = enriched.get("expected_revenue", 0) or 0
        else:
            # Sans enrichissement - données basiques uniquement
            items.append(ProspectOut(
                id=p.id,
                odoo_lead_id=p.odoo_lead_id,
                status=p.status,
                status_label=_format_prospect_status(p.status),
                portalis_sector=p.portalis_sector,
                portalis_notes=p.portalis_notes,
                expected_revenue=0,
                created_at=p.created_at,
                updated_at=p.updated_at,
                status_changed_at=p.status_changed_at,
                pipeline_age_days=_compute_pipeline_age_days(p),
                company_name=None,
                contact_name=None,
                email=None,
                phone=None,
                assigned_to_id=None,
                assigned_to_name=None,
                team_id=None,
                team_name=None,
                probability=None,
                priority=None,
                last_sync_at=None,
            ))
            revenue = 0
        
        total_pipeline += Decimal(str(revenue))
        status_values[p.status] += Decimal(str(revenue))

    return ProspectListOut(
        items=items,
        total=total,
        limit=filters.limit,
        offset=filters.offset,
        by_status=ProspectStatusOut(**status_counts),
        by_status_value=ProspectStatusValueOut(**status_values),
        total_pipeline_value=total_pipeline,
    )


@router.post("", dependencies=_prospect_write_deps, status_code=status.HTTP_201_CREATED)
async def create_prospect(
    user: CurrentUser,
    payload: ProspectCreate,
) -> ProspectOut:
    """Crée un nouveau prospect (dans Portalis + Odoo).
    
    Logique:
    - Si company_id fourni: récupère l'erp_id de la company (ou crée le partner si inexistant)
    - Sinon si partner_name fourni: crée le client dans Odoo puis l'utilise
    - Sinon: crée lead sans client lié
    """
    sync_service = _get_sync_service()

    # 1. Déterminer le partner_id à utiliser
    partner_id = None
    
    # Si company_id fourni, récupérer l'erp_id de la company
    if payload.company_id:
        from app.application.companies.get_company import GetCompanyUseCase
        from app.infrastructure.db.repositories.company import CompanyRepository
        
        company = await GetCompanyUseCase(CompanyRepository()).execute(payload.company_id)
        if company:
            if company.erp_id:
                # Company a déjà un erp_id → l'utiliser
                partner_id = company.erp_id
            elif payload.partner_name:
                # Company n'a pas d'erp_id → créer le partner dans Odoo
                partner_id = await sync_service.create_partner_in_odoo(
                    name=payload.partner_name,
                    email=payload.email,
                    phone=payload.phone,
                    is_company=True,
                )
                # Mettre à jour la company avec l'erp_id
                company.erp_id = partner_id
                await company.save()
    
    if not partner_id and payload.partner_name:
        # Créer le client dans Odoo
        partner_id = await sync_service.create_partner_in_odoo(
            name=payload.partner_name,
            email=payload.email,
            phone=payload.phone,
            is_company=True,
        )
        
    # 2. Création dans Odoo (lead ou opportunity)
   
    tag_ids = None  # TODO: mapping sector → tag_ids
    odoo_lead_id = await sync_service.create_in_odoo(
        name=payload.opportunity_name,
        contact_name=payload.contact_name,
        email=payload.email,
        phone=payload.phone,
        user_id=payload.user_id,
        team_id=payload.team_id,
        expected_revenue=payload.expected_revenue,
        tag_ids=tag_ids,
        partner_id=partner_id,
        lead_type=payload.lead_type,
        probability=payload.probability,
        date_deadline=payload.date_deadline,
    )
    
    if not odoo_lead_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Échec création lead dans Odoo - odoo_lead_id est None"
        )
    
    # 3. Construction des erp_metadata avec les données Odoo
    erp_metadata = {
        "id": odoo_lead_id,
        "name": payload.opportunity_name,
        "type": payload.lead_type or "lead",
        "contact_name": payload.contact_name,
        "email_from": payload.email,
        "phone": payload.phone,
        "expected_revenue": payload.expected_revenue,
        "probability": payload.probability,
        "partner_id": partner_id,
        "user_id": payload.user_id,
        "team_id": payload.team_id,
        "date_deadline": payload.date_deadline.isoformat() if payload.date_deadline else None,
    }
    
    # 4. Création dans Portalis
    prospect = await ProspectOrm.create(
        odoo_lead_id=odoo_lead_id,
        status="nouveau",
        portalis_sector=payload.portalis_sector,
        created_by=user.id,
        erp_metadata=erp_metadata,
    )
    
    # 4. Log activité
    await ProspectActivityOrm.create(
        prospect_id=prospect.id,
        activity_type="created",
        description=f"Prospect créé par {user.email}",
        performed_by=user.id,
    )

    # 5. Retour enrichi
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

    if odoo_values and prospect.odoo_lead_id:
        sync_service = _get_sync_service()
        success = await sync_service.update_in_odoo(prospect.odoo_lead_id, odoo_values)
        if not success:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                "Erreur mise à jour Odoo",
            )
        
        # Mise à jour du erp_metadata local avec les nouvelles valeurs
        if prospect.erp_metadata:
            prospect.erp_metadata.update(odoo_values)
        else:
            prospect.erp_metadata = odoo_values
        await prospect.save()

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

    sync_service = _get_sync_service()

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

    sync_service = _get_sync_service()
    result = await sync_service.sync_all_prospects(full_sync=full_sync)

    return SyncStatusOut(
        last_sync_at=None,  # Mis à jour par la sync
        synced_count=result.get("updated", 0),
        pending_sync_count=0,
        errors=result.get("errors", []),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Notes (textuelles sur un prospect)
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/{prospect_id}/notes", dependencies=_prospect_write_deps)
async def create_note(
    prospect_id: UUID,
    data: NoteCreate,
    current_user: CurrentUser,
) -> NoteOut:
    """Ajouter une note sur un prospect."""

    prospect = await ProspectOrm.get_or_none(id=prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")

    note = await NoteOrm.create(
        prospect_id=prospect_id,
        author_id=current_user.id,
        content=data.content,
    )

    return NoteOut(
        id=note.id,
        prospect_id=note.prospect_id,
        author_id=note.author_id,
        content=note.content,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("/{prospect_id}/notes", dependencies=_prospect_deps)
async def list_notes(
    prospect_id: UUID,
    limit: int = 50,
    offset: int = 0,
) -> NoteListOut:
    """Lister les notes d'un prospect (ordre chronologique inverse)."""

    prospect = await ProspectOrm.get_or_none(id=prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")

    notes = await NoteOrm.filter(prospect_id=prospect_id).offset(offset).limit(limit).order_by("-created_at")
    total = await NoteOrm.filter(prospect_id=prospect_id).count()

    items = [
        NoteOut(
            id=n.id,
            prospect_id=n.prospect_id,
            author_id=n.author_id,
            content=n.content,
            created_at=n.created_at,
            updated_at=n.updated_at,
        )
        for n in notes
    ]

    return NoteListOut(items=items, total=total)


@router.delete("/{prospect_id}/notes/{note_id}", dependencies=_prospect_write_deps)
async def delete_note(
    prospect_id: UUID,
    note_id: UUID,
) -> None:
    """Supprimer une note d'un prospect."""

    deleted = await NoteOrm.filter(id=note_id, prospect_id=prospect_id).delete()
    if not deleted:
        raise HTTPException(status_code=404, detail="Note non trouvée")


# ═══════════════════════════════════════════════════════════════════════════════
# Compte-Rendus (PDF générés)
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/{prospect_id}/compte-rendus", dependencies=_prospect_write_deps)
async def generate_compte_rendu(
    prospect_id: UUID,
    data: CompteRenduGenerate,
    current_user: CurrentUser,
) -> CompteRenduOut:
    """Générer un compte-rendu PDF pour un prospect (via Claude + MinIO)."""
    from app.services.compte_rendu import CompteRenduService

    prospect = await ProspectOrm.get_or_none(id=prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")

    try:
        service = CompteRenduService()
        cr = await service.generate(
            prospect_id=prospect_id,
            note_ids=data.note_ids,
            author_id=current_user.id,
            template=data.template,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Générer URL de download
    from app.infrastructure.storage.minio import StorageService

    storage = StorageService()
    download_url = storage.get_url(cr.minio_path, expires_in=3600)

    return CompteRenduOut(
        id=cr.id,
        parent_type=cr.parent_type,
        parent_id=cr.parent_id,
        version=cr.version,
        status=cr.status,
        file_size=cr.file_size,
        download_url=download_url,
        generated_by=cr.generated_by,
        note_ids=cr.note_ids,
        created_at=cr.created_at,
        created_by=cr.created_by,
    )


@router.get("/{prospect_id}/compte-rendus", dependencies=_prospect_deps)
async def list_compte_rendus(
    prospect_id: UUID,
    limit: int = 10,
    offset: int = 0,
) -> CompteRenduListOut:
    """Lister les compte-rendus d'un prospect."""

    prospect = await ProspectOrm.get_or_none(id=prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect non trouvé")

    crs = (
        await CompteRenduOrm.filter(
            parent_type="prospect",
            parent_id=prospect_id,
        )
        .offset(offset)
        .limit(limit)
        .order_by("-created_at")
    )
    total = await CompteRenduOrm.filter(
        parent_type="prospect",
        parent_id=prospect_id,
    ).count()

    items = [
        CompteRenduOut(
            id=cr.id,
            parent_type=cr.parent_type,
            parent_id=cr.parent_id,
            version=cr.version,
            status=cr.status,
            file_size=cr.file_size,
            download_url=None,  # À générer avec URL signée
            generated_by=cr.generated_by,
            note_ids=cr.note_ids,
            created_at=cr.created_at,
            created_by=cr.created_by,
        )
        for cr in crs
    ]

    return CompteRenduListOut(items=items, total=total)


@router.get("/{prospect_id}/compte-rendus/{cr_id}/download", dependencies=_prospect_deps)
async def download_compte_rendu(
    prospect_id: UUID,
    cr_id: UUID,
) -> dict:
    """Obtenir l'URL de téléchargement d'un compte-rendu."""

    cr = await CompteRenduOrm.get_or_none(
        id=cr_id,
        parent_type="prospect",
        parent_id=prospect_id,
    )
    if not cr:
        raise HTTPException(status_code=404, detail="Compte-rendu non trouvé")

    # Générer URL signée MinIO
    from app.infrastructure.storage.minio import StorageService

    storage = StorageService()
    download_url = storage.get_url(cr.minio_path, expires_in=3600)  # 1h

    return {"download_url": download_url, "filename": f"CR_{cr.parent_id}_v{cr.version}.pdf"}
