"""Repository : prédictions commerciales."""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.infrastructure.db.models.commercial_prediction import CommercialPredictionOrm


class CommercialPredictionRepository:

    async def create(
        self,
        partner_id: int,
        partner_name: str,
        prediction_summary: str,
        suggested_action: str,
        opportunity_type: str = "opportunite",
        confidence_score: float = 0.0,
        predicted_revenue: float | None = None,
        data_sources: dict | None = None,
    ) -> CommercialPredictionOrm:
        return await CommercialPredictionOrm.create(
            id=uuid4(),
            partner_id=partner_id,
            partner_name=partner_name,
            prediction_summary=prediction_summary,
            suggested_action=suggested_action,
            opportunity_type=opportunity_type,
            confidence_score=confidence_score,
            predicted_revenue=predicted_revenue,
            data_sources=data_sources or {},
            status="pending",
        )

    async def get(self, prediction_id: UUID) -> CommercialPredictionOrm | None:
        return await CommercialPredictionOrm.get_or_none(id=prediction_id)

    async def list_pending(self, limit: int = 50) -> list[CommercialPredictionOrm]:
        return (
            await CommercialPredictionOrm.filter(status="pending")
            .order_by("-created_at")
            .limit(limit)
        )

    async def list_all(
        self,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[CommercialPredictionOrm]:
        qs = CommercialPredictionOrm.all()
        if status:
            qs = qs.filter(status=status)
        return await qs.order_by("-created_at").offset(offset).limit(limit)

    async def validate(
        self,
        prediction_id: UUID,
        validated_by: UUID,
        prospect_id: UUID,
        odoo_lead_id: int,
    ) -> CommercialPredictionOrm | None:
        orm = await CommercialPredictionOrm.get_or_none(id=prediction_id)
        if orm is None:
            return None
        orm.status = "validated"
        orm.validated_by = validated_by
        orm.validated_at = datetime.now(UTC)
        orm.prospect_id = prospect_id
        orm.odoo_lead_id = odoo_lead_id
        await orm.save()
        return orm

    async def reject(
        self,
        prediction_id: UUID,
        rejected_by: UUID,
        reason: str | None = None,
    ) -> CommercialPredictionOrm | None:
        orm = await CommercialPredictionOrm.get_or_none(id=prediction_id)
        if orm is None:
            return None
        orm.status = "rejected"
        orm.rejected_by = rejected_by
        orm.rejected_at = datetime.now(UTC)
        orm.rejection_reason = reason
        await orm.save()
        return orm
