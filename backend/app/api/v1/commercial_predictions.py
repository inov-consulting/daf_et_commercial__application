"""Router API : prédictions commerciales IA.

Endpoints :
  GET  /commercial/predictions              → liste (filtre par statut)
  GET  /commercial/predictions/{id}         → détail
  POST /commercial/predictions/{id}/validate → valide → crée prospect + lead Odoo
  POST /commercial/predictions/{id}/reject   → rejette
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentUser, require_permission
from app.api.v1.schemas.commercial_prediction import (
    PredictionOut,
    RejectIn,
    ValidateIn,
    ValidationOut,
)
from app.core.logging import get_logger
from app.infrastructure.db.repositories.commercial_prediction import CommercialPredictionRepository

logger = get_logger(__name__)

router = APIRouter(prefix="/commercial/predictions", tags=["commercial-predictions"])

_read_deps   = [Depends(require_permission("commercial:read"))]
_create_deps = [Depends(require_permission("commercial:create"))]


def _to_out(orm) -> PredictionOut:
    return PredictionOut(
        id=orm.id,
        partner_id=orm.partner_id,
        partner_name=orm.partner_name,
        prediction_summary=orm.prediction_summary,
        suggested_action=orm.suggested_action,
        opportunity_type=orm.opportunity_type,
        confidence_score=orm.confidence_score,
        predicted_revenue=orm.predicted_revenue,
        data_sources=orm.data_sources or {},
        status=orm.status,
        validated_by=orm.validated_by,
        validated_at=orm.validated_at,
        rejected_by=orm.rejected_by,
        rejected_at=orm.rejected_at,
        rejection_reason=orm.rejection_reason,
        prospect_id=orm.prospect_id,
        odoo_lead_id=orm.odoo_lead_id,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


@router.get("", dependencies=_read_deps)
async def list_predictions(
    prediction_status: str | None = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[PredictionOut]:
    """Liste les prédictions commerciales, filtrées par statut optionnel."""
    repo = CommercialPredictionRepository()
    rows = await repo.list_all(status=prediction_status, limit=limit, offset=offset)
    return [_to_out(r) for r in rows]


@router.get("/{prediction_id}", dependencies=_read_deps)
async def get_prediction(prediction_id: UUID) -> PredictionOut:
    """Détail d'une prédiction."""
    repo = CommercialPredictionRepository()
    orm = await repo.get(prediction_id)
    if orm is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Prédiction introuvable")
    return _to_out(orm)


@router.post("/{prediction_id}/validate", dependencies=_create_deps)
async def validate_prediction(
    prediction_id: UUID,
    body: ValidateIn,
    current_user: CurrentUser,
) -> ValidationOut:
    """Valide une prédiction et crée automatiquement un prospect dans Portalis + un lead dans Odoo.

    Prérequis : prédiction au statut `pending`.
    """
    repo = CommercialPredictionRepository()
    pred = await repo.get(prediction_id)

    if pred is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Prédiction introuvable")
    if pred.status != "pending":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Prédiction déjà traitée (statut: {pred.status})",
        )

    # ── Créer le lead dans Odoo ───────────────────────────────────────────────
    from app.services.prospect_sync import ProspectSyncService

    sync = ProspectSyncService()
    revenue = body.expected_revenue or pred.predicted_revenue or 0

    opportunity_name = f"[IA] {pred.suggested_action[:100]}"
    notes_text = (
        f"Prédiction IA — {pred.opportunity_type}\n"
        f"Confiance : {int(pred.confidence_score * 100)}%\n"
        f"{body.notes or ''}"
    ).strip()

    try:
        odoo_lead_id = await sync.create_in_odoo(
            name=opportunity_name,
            partner_name=pred.partner_name,
            contact_name=None,
            email=None,
            phone=None,
            user_id=None,
            team_id=None,
            expected_revenue=int(revenue),
            partner_id=pred.partner_id,
            lead_type="opportunity",
            probability=int(pred.confidence_score * 100),
        )
    except Exception as exc:
        logger.error("prediction.validate.odoo_failed prediction_id=%s: %s", prediction_id, exc)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Échec de création du lead Odoo : {exc}",
        ) from exc

    # ── Créer le prospect dans Portalis ──────────────────────────────────────
    from uuid import uuid4
    from app.infrastructure.db.models.prospect import ProspectOrm

    erp_metadata = {
        "id": odoo_lead_id,
        "name": opportunity_name,
        "partner_name": pred.partner_name,
        "type": "opportunity",
        "expected_revenue": revenue,
        "probability": int(pred.confidence_score * 100),
        "partner_id": pred.partner_id,
    }

    prospect = await ProspectOrm.create(
        id=uuid4(),
        portalis_notes=notes_text,
        status="nouveau",
        odoo_lead_id=odoo_lead_id,
        erp_metadata=erp_metadata,
    )

    # ── Mettre à jour la prédiction ──────────────────────────────────────────
    await repo.validate(
        prediction_id=prediction_id,
        validated_by=current_user.id,
        prospect_id=prospect.id,
        odoo_lead_id=odoo_lead_id,
    )

    logger.info(
        "prediction.validated prediction_id=%s prospect_id=%s odoo_lead_id=%s",
        prediction_id, prospect.id, odoo_lead_id,
    )

    return ValidationOut(
        prediction_id=prediction_id,
        status="validated",
        prospect_id=prospect.id,
        odoo_lead_id=odoo_lead_id,
        message=f"Pipeline créé : prospect {prospect.id} | lead Odoo #{odoo_lead_id}",
    )


@router.post("/{prediction_id}/reject", dependencies=_create_deps)
async def reject_prediction(
    prediction_id: UUID,
    body: RejectIn,
    current_user: CurrentUser,
) -> PredictionOut:
    """Rejette une prédiction (statut pending → rejected)."""
    repo = CommercialPredictionRepository()
    pred = await repo.get(prediction_id)

    if pred is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Prédiction introuvable")
    if pred.status != "pending":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Prédiction déjà traitée (statut: {pred.status})",
        )

    updated = await repo.reject(
        prediction_id=prediction_id,
        rejected_by=current_user.id,
        reason=body.reason,
    )
    return _to_out(updated)  # type: ignore[arg-type]
