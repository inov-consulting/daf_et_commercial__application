"""Repository : offres transport."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.domain.transport.offer import TransportOffer
from app.infrastructure.db.models.transport_offer import TransportOfferOrm


def _to_domain(orm: TransportOfferOrm) -> TransportOffer:
    return TransportOffer(
        id=orm.id,
        session_id=orm.session_id,
        user_id=orm.user_id,
        status=orm.status,  # type: ignore[arg-type]
        collected_data=orm.collected_data or {},
        document_markdown=orm.document_markdown,
        document_generated_at=orm.document_generated_at,
        odoo_shipment_id=orm.odoo_shipment_id,
        odoo_shipment_name=orm.odoo_shipment_name,
        confirmed_at=orm.confirmed_at,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
    )


class TransportOfferRepository:
    async def create(self, session_id: UUID, user_id: UUID | None = None) -> TransportOffer:
        orm = await TransportOfferOrm.create(
            id=uuid4(),
            session_id=session_id,
            user_id=user_id,
            status="draft",
        )
        return _to_domain(orm)

    async def get(self, offer_id: UUID) -> TransportOffer | None:
        orm = await TransportOfferOrm.get_or_none(id=offer_id)
        return _to_domain(orm) if orm else None

    async def update_collected_data(self, offer_id: UUID, data: dict) -> TransportOffer | None:
        orm = await TransportOfferOrm.get_or_none(id=offer_id)
        if orm is None:
            return None
        orm.collected_data = data
        await orm.save()
        return _to_domain(orm)

    async def set_document(self, offer_id: UUID, markdown: str) -> TransportOffer | None:
        orm = await TransportOfferOrm.get_or_none(id=offer_id)
        if orm is None:
            return None
        orm.document_markdown = markdown
        orm.document_generated_at = datetime.now(tz=timezone.utc)
        orm.status = "generated"
        await orm.save()
        return _to_domain(orm)

    async def confirm(
        self,
        offer_id: UUID,
        odoo_shipment_id: int,
        odoo_shipment_name: str,
    ) -> TransportOffer | None:
        orm = await TransportOfferOrm.get_or_none(id=offer_id)
        if orm is None:
            return None
        orm.odoo_shipment_id = odoo_shipment_id
        orm.odoo_shipment_name = odoo_shipment_name
        orm.confirmed_at = datetime.now(tz=timezone.utc)
        orm.status = "confirmed"
        await orm.save()
        return _to_domain(orm)

    async def set_status(self, offer_id: UUID, new_status: str) -> TransportOffer | None:
        orm = await TransportOfferOrm.get_or_none(id=offer_id)
        if orm is None:
            return None
        orm.status = new_status
        await orm.save()
        return _to_domain(orm)

    async def cancel(self, offer_id: UUID) -> TransportOffer | None:
        orm = await TransportOfferOrm.get_or_none(id=offer_id)
        if orm is None:
            return None
        orm.status = "cancelled"
        await orm.save()
        return _to_domain(orm)

    async def list_by_user(self, user_id: UUID, limit: int = 20) -> list[TransportOffer]:
        rows = await TransportOfferOrm.filter(user_id=user_id).order_by("-created_at").limit(limit)
        return [_to_domain(r) for r in rows]

    async def list(self, user_id: UUID, limit: int = 20) -> list[TransportOffer]:
        rows = await TransportOfferOrm.filter().order_by("-created_at").limit(limit)
        return [_to_domain(r) for r in rows]

    async def create_manual(
        self, collected_data: dict, user_id: UUID | None = None
    ) -> TransportOffer:
        """Crée une offre directement depuis un formulaire (sans passage par l'IA).

        Le statut est `completed` car toutes les données sont fournies d'emblée.
        """
        orm = await TransportOfferOrm.create(
            id=uuid4(),
            session_id=uuid4(),
            user_id=user_id,
            status="completed",
            collected_data=collected_data,
        )
        return _to_domain(orm)

    async def update_form(
        self, offer_id: UUID, collected_data_patch: dict
    ) -> TransportOffer | None:
        """Met à jour les données collectées d'une offre existante (formulaire).

        - Fusionne les champs fournis avec les données existantes (PATCH partiel).
        - Si l'offre avait déjà un document généré, le statut repasse à `completed`
          pour signaler que le document doit être regénéré.
        - Les offres `confirmed` ou `cancelled` ne sont pas modifiables.
        """
        orm = await TransportOfferOrm.get_or_none(id=offer_id)
        if orm is None:
            return None
        if orm.status in ("confirmed", "cancelled"):
            return None

        merged = {**(orm.collected_data or {}), **collected_data_patch}
        orm.collected_data = merged

        if orm.status in ("generated", "validated"):
            orm.document_markdown = None
            orm.document_generated_at = None
            orm.status = "completed"

        await orm.save()
        return _to_domain(orm)
