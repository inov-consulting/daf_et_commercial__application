"""Router API Compte-Rendus (module indépendant)."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.deps import require_permission
from app.api.v1.schemas.prospects import (
    CompteRenduListItemOut,
    CompteRenduParentInfo,
    CompteRenduWithParentListOut,
    CompteRenduWithParentOut,
)
from app.infrastructure.db.models.note import CompteRenduOrm
from app.infrastructure.db.models.prospect import ProspectOrm
from app.infrastructure.storage.minio import StorageService

router = APIRouter(prefix="/compte-rendus", tags=["compte-rendus"])

_cr_deps        = [Depends(require_permission("cr:read"))]
_cr_update_deps = [Depends(require_permission("cr:update"))]


def _build_prospect_parent(
    parent_id: UUID,
    prospect: ProspectOrm | None,
) -> CompteRenduParentInfo:
    """Construit le parent à partir du prospect (ou un objet minimal si introuvable)."""
    erp_data = (prospect.erp_metadata or {}) if prospect else {}
    return CompteRenduParentInfo(
        type="prospect",
        id=parent_id,
        name=erp_data.get("name") or erp_data.get("partner_name") or "Prospect sans nom",
        status=prospect.status if prospect else None,
        email=erp_data.get("email_from"),
        phone=erp_data.get("phone"),
        company_name=erp_data.get("partner_name"),
    )


@router.get("", dependencies=_cr_deps)
async def list_compte_rendus(
    parent_type: Annotated[str | None, Query(description="Filtrer par type: prospect, service, etc.")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CompteRenduWithParentListOut:
    """Lister tous les comptes-rendus avec leur parent associé."""
    query = CompteRenduOrm.all()
    if parent_type:
        query = query.filter(parent_type=parent_type)

    total = await query.count()
    crs = await query.order_by("-created_at").offset(offset).limit(limit)

    storage = StorageService()
    items: list[CompteRenduListItemOut] = []

    for cr in crs:
        download_url = storage.get_url(cr.minio_path)

        cr_data = {
            "id": cr.id,
            "parent_type": cr.parent_type,
            "parent_id": cr.parent_id,
            "version": cr.version,
            "status": cr.status,
            "file_size": cr.file_size,
            "download_url": download_url,
            "generated_by": cr.generated_by,
            "note_ids": cr.note_ids,
            "created_at": cr.created_at,
            "created_by": cr.created_by_id,
            "parent": None,
        }

        if cr.parent_type in ("prospect", "prospections", "prospection"):
            prospect = await ProspectOrm.get_or_none(id=cr.parent_id)
            erp_data = (prospect.erp_metadata or {}) if prospect else {}
            cr_data["parent"] = CompteRenduParentInfo(
                type="prospect",
                id=cr.parent_id,
                name=erp_data.get("name") or erp_data.get("partner_name") or "Prospect sans nom",
                status=prospect.status if prospect else None,
                email=erp_data.get("email_from"),
                phone=erp_data.get("phone"),
                company_name=erp_data.get("partner_name"),
            )

        items.append(CompteRenduListItemOut.model_validate(cr_data))

    return CompteRenduWithParentListOut(
        items=items,
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{cr_id}", dependencies=_cr_deps)
async def get_compte_rendu(cr_id: UUID) -> CompteRenduWithParentOut:
    """Récupérer un compte-rendu par ID avec content HTML complet."""
    from fastapi import HTTPException, status

    cr = await CompteRenduOrm.get_or_none(id=cr_id)
    if not cr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compte-rendu non trouvé",
        )

    storage = StorageService()
    download_url = storage.get_url(cr.minio_path)

    cr_data = {
        "id": cr.id,
        "parent_type": cr.parent_type,
        "parent_id": cr.parent_id,
        "version": cr.version,
        "status": cr.status,
        "file_size": cr.file_size,
        "download_url": download_url,
        "generated_by": cr.generated_by,
        "content": cr.content,
        "note_ids": cr.note_ids,
        "created_at": cr.created_at,
        "created_by": cr.created_by_id,
        "parent": None,
    }

    if cr.parent_type in ("prospect", "prospections", "prospection"):
        prospect = await ProspectOrm.get_or_none(id=cr.parent_id)
        cr_data["parent"] = _build_prospect_parent(cr.parent_id, prospect)

    return CompteRenduWithParentOut.model_validate(cr_data)


class LinkProspectIn(BaseModel):
    prospect_id: UUID


@router.patch("/{cr_id}/link-prospect", dependencies=_cr_update_deps)
async def link_to_prospect(cr_id: UUID, body: LinkProspectIn) -> dict:
    """Associe un compte rendu existant (ex: issu d'une conversation WhatsApp) à une prospection.

    Met à jour parent_type → 'prospect' et parent_id → prospect_id.
    """
    cr = await CompteRenduOrm.get_or_none(id=cr_id)
    if not cr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte rendu introuvable")

    prospect = await ProspectOrm.get_or_none(id=body.prospect_id)
    if not prospect:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prospection introuvable")

    existing = await CompteRenduOrm.filter(parent_type="prospect", parent_id=body.prospect_id).count()
    cr.parent_type = "prospect"
    cr.parent_id = body.prospect_id
    cr.version = existing + 1
    await cr.save()

    return {"cr_id": cr.id, "prospect_id": body.prospect_id, "version": cr.version}
