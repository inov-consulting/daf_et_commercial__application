"""Router API : offres transport générées par conversation IA.

Flux :
  POST /offers/chat              → tour de conversation (collecte ou génération)
  POST /offers/{id}/generate     → génère le document Markdown via Claude
  POST /offers/{id}/confirm      → valide + crée le dossier Odoo via MCP
  GET  /offers/{id}              → détail d'une offre
  GET  /offers/                  → liste des offres de l'utilisateur
  POST /offers/{id}/cancel       → annule une offre
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, require_permission
from app.api.v1.schemas.transport_offer import (
    OfferChatIn,
    OfferChatOut,
    OfferConfirmOut,
    OfferDocumentOut,
    OfferDocumentSection,
    OfferRoute,
    OfferClient,
    PricingLine,
    OfferSummaryOut,
)
from app.core.logging import get_logger
from app.infrastructure.ai.transport_offer_agent import (
    create_odoo_shipment_from_offer,
    extract_collected_data,
    generate_offer_document,
    run_offer_chat,
)
from app.infrastructure.db.repositories.app_config import AppConfigRepository
from app.infrastructure.db.repositories.transport_offer import TransportOfferRepository

logger = get_logger(__name__)

router = APIRouter(prefix="/transport/offers", tags=["transport-offers"])

_read_deps = [Depends(require_permission("transport:read"))]
_write_deps = [Depends(require_permission("transport:read"))]
_confirm_deps = [Depends(require_permission("transport:confirm"))]


# ── Chat ──────────────────────────────────────────────────────────────────────

@router.post("/chat", dependencies=_write_deps)
async def offer_chat(
    body: OfferChatIn,
    current_user=Depends(get_current_user),
) -> OfferChatOut:
    """Tour de conversation avec l'agent IA pour créer une offre transport.

    - Première requête : laisser `session_id` et `offer_id` à null.
    - Tours suivants : passer les IDs retournés par la réponse précédente.
    - Quand l'agent répond "générer", appeler `POST /offers/{id}/generate`.
    """
    repo = TransportOfferRepository()

    # Première requête → créer l'offre et la session
    if body.offer_id is None:
        from uuid import uuid4
        session_id = body.session_id or uuid4()
        offer = await repo.create(session_id=session_id, user_id=current_user.id)
    else:
        offer = await repo.get(body.offer_id)
        if offer is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre non trouvée")
        if offer.status in ("confirmed", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Offre {offer.status}, impossible de continuer la conversation",
            )
        session_id = offer.session_id

    response, _ = await run_offer_chat(body.message, session_id=session_id)

    # Rafraîchir pour détecter un changement de statut (ex: mark_offer_completed appelé par l'agent)
    refreshed = await repo.get(offer.id)
    if refreshed:
        offer = refreshed

    # Extraction des données uniquement quand l'agent a terminé la collecte —
    # évite un appel LLM supplémentaire à chaque tour de conversation.
    if offer.status == "completed" and not offer.collected_data:
        try:
            extracted = await extract_collected_data(session_id)
            if extracted:
                await repo.update_collected_data(offer.id, extracted)
                offer = await repo.get(offer.id) or offer
        except Exception as exc:
            logger.warning("offer.chat.extract_failed", offer_id=str(offer.id), error=str(exc))

    return OfferChatOut(
        offer_id=offer.id,
        session_id=session_id,
        response=response,
        status=offer.status,
    )


# ── Génération du document ────────────────────────────────────────────────────

@router.post("/{offer_id}/generate", dependencies=_write_deps)
async def generate_document(
    offer_id: UUID,
    current_user=Depends(get_current_user),
) -> OfferDocumentOut:
    """Génère le document d'offre officiel via Claude.

    À appeler après que l'agent a confirmé avoir collecté toutes les informations.
    Le document généré est sauvegardé et le statut passe à `generated`.
    """
    repo = TransportOfferRepository()
    offer = await repo.get(offer_id)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre non trouvée")
    if offer.status == "confirmed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Offre déjà confirmée")
    if offer.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Offre annulée")
    if offer.status == "generated":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Offre déjà générée")

    # Si collected_data est vide, tenter une extraction depuis la session
    collected = offer.collected_data
    if not collected:
        try:
            collected = await extract_collected_data(offer.session_id)
            if collected:
                await repo.update_collected_data(offer_id, collected)
        except Exception as exc:
            logger.warning("offer.generate.extract_failed", offer_id=str(offer_id), error=str(exc))

    if not collected:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aucune donnée collectée. Veuillez d'abord compléter la conversation.",
        )

    doc = await generate_offer_document(collected)

    import json
    markdown = json.dumps(doc, ensure_ascii=False, indent=2)
    offer = await repo.set_document(offer_id, markdown)

    # Notifier le validateur désigné — les warnings sont remontés dans la réponse
    from app.services.notification_email import notify_offer_generated
    notif_warnings = await notify_offer_generated(
        offer_id=offer_id,
        offer_title=doc.get("title"),
        author_name=current_user.display_name,
    )

    out = _doc_to_out(offer_id, offer.status if offer else "generated", doc)  # type: ignore[union-attr]
    out.warnings = notif_warnings
    return out


# ── Validation (côté Portalis uniquement) ────────────────────────────────────

@router.post("/{offer_id}/validate", dependencies=_write_deps)
async def validate_offer(
    offer_id: UUID,
    current_user=Depends(get_current_user),
) -> OfferSummaryOut:
    """Valide l'offre côté Portalis (statut generated → validated).

    Ne crée rien dans Odoo. Appeler `confirm` ensuite pour créer le dossier.
    Prérequis : l'offre doit être au statut `generated`.
    Si un validateur est configuré dans AppConfig, seul cet utilisateur peut valider.
    """
    # Vérifier si un validateur est explicitement désigné dans la configuration
    app_cfg = await AppConfigRepository().get()
    designated = app_cfg.validators.offer_validator_user_id
    if designated and current_user.id != designated:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "NOT_DESIGNATED_VALIDATOR",
                "message": "Un validateur désigné est configuré. Seul cet utilisateur peut valider les offres.",
            },
        )

    repo = TransportOfferRepository()
    offer = await repo.get(offer_id)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre non trouvée")
    if offer.status != "generated":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"L'offre doit être au statut 'generated' (actuel: {offer.status}). Générez d'abord le document.",
        )
   
    # Gardé pour compatibilité mais ne change plus le statut
    offer = await repo.set_status(offer_id, "validated")
    return OfferSummaryOut(
        id=offer.id,  # type: ignore[union-attr]
        session_id=offer.session_id,  # type: ignore[union-attr]
        status=offer.status,  # type: ignore[union-attr]
        odoo_shipment_id=offer.odoo_shipment_id,  # type: ignore[union-attr]
        odoo_shipment_name=offer.odoo_shipment_name,  # type: ignore[union-attr]
        created_at=offer.created_at,  # type: ignore[union-attr]
        confirmed_at=offer.confirmed_at,  # type: ignore[union-attr]
    )


# ── Envoi vers Odoo (action explicite) ───────────────────────────────────────

@router.post("/{offer_id}/confirm", dependencies=_write_deps)
async def send_offer_to_odoo(offer_id: UUID) -> OfferConfirmOut:
    """Crée le dossier transport dans Odoo via MCP et lie l'offre.

    Prérequis : l'offre doit être au statut `generated`.
    """
    repo = TransportOfferRepository()
    offer = await repo.get(offer_id)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre non trouvée")
    if offer.status != "generated":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"L'offre doit être au statut 'generated' (actuel: {offer.status}). Générez d'abord le document.",
        )

    import json
    try:
        doc = json.loads(offer.document_markdown or "{}")
    except json.JSONDecodeError:
        doc = {}

    # Injecter collected_data (marchandise, etc.) dans doc pour la création Odoo
    if offer.collected_data:
        doc["collected_data"] = offer.collected_data

    try:
        odoo_id, odoo_name = await create_odoo_shipment_from_offer(doc)
    except Exception as exc:
        logger.error("offer.send_to_odoo.failed", offer_id=str(offer_id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Échec de la création Odoo : {exc}",
        )

    offer = await repo.confirm(offer_id, odoo_id, odoo_name)
   
    if offer is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la liaison Odoo")
        

    return OfferConfirmOut(
        offer_id=offer_id,
        status="confirmed",
        odoo_shipment_id=odoo_id,
        odoo_shipment_name=odoo_name,
        confirmed_at=offer.confirmed_at,  # type: ignore[arg-type]
    )


# ── Lecture ───────────────────────────────────────────────────────────────────

@router.get("/{offer_id}", dependencies=_read_deps)
async def get_offer(offer_id: UUID) -> OfferDocumentOut:
    """Détail d'une offre avec son document généré."""
    repo = TransportOfferRepository()
    offer = await repo.get(offer_id)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre non trouvée")

    import json
    doc: dict = {}
    if offer.document_markdown:
        try:
            doc = json.loads(offer.document_markdown)
        except json.JSONDecodeError:
            pass

    return _doc_to_out(offer_id, offer.status, doc, generated_at=offer.document_generated_at)


@router.get("/", dependencies=_read_deps)
async def list_offers(
    current_user=Depends(get_current_user),
) -> list[OfferSummaryOut]:
    """Liste les offres de l'utilisateur connecté."""
    repo = TransportOfferRepository()
    offers = await repo.list_by_user(current_user.id)
    return [
        OfferSummaryOut(
            id=o.id,
            session_id=o.session_id,
            status=o.status,
            **_extract_doc_summary(o.document_markdown),
            odoo_shipment_id=o.odoo_shipment_id,
            odoo_shipment_name=o.odoo_shipment_name,
            created_at=o.created_at,
            confirmed_at=o.confirmed_at,
        )
        for o in offers
    ]


@router.post("/{offer_id}/cancel", dependencies=_write_deps)
async def cancel_offer(offer_id: UUID) -> OfferSummaryOut:
    """Annule une offre en cours."""
    repo = TransportOfferRepository()
    offer = await repo.cancel(offer_id)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre non trouvée")
    return OfferSummaryOut(
        id=offer.id,
        session_id=offer.session_id,
        status=offer.status,
        **_extract_doc_summary(offer.document_markdown),
        odoo_shipment_id=offer.odoo_shipment_id,
        odoo_shipment_name=offer.odoo_shipment_name,
        created_at=offer.created_at,
        confirmed_at=offer.confirmed_at,
    )


# ── Helper ────────────────────────────────────────────────────────────────────

def _extract_doc_summary(document_markdown: str | None) -> dict:
    """Extrait les champs de résumé du document JSON sérialisé."""
    import json
    if not document_markdown:
        return {}
    try:
        doc = json.loads(document_markdown)
        result: dict = {
            k: doc[k]
            for k in ("title", "reference", "date", "validity_days")
            if doc.get(k) is not None
        }

        # Trajet origine → destination
        route_raw = doc.get("route") or {}
        if route_raw:
            from app.api.v1.schemas.transport_offer import OfferRoute
            result["route"] = OfferRoute(
                origin=route_raw.get("origin"),
                destination=route_raw.get("destination"),
                transport_mode=route_raw.get("transport_mode"),
                vehicle_type=route_raw.get("vehicle_type"),
                planned_date=route_raw.get("planned_date"),
            )

        # Montant TTC depuis la liste pricing
        for line in doc.get("pricing", []):
            if "ttc" in line.get("label", "").lower():
                try:
                    result["amount_ttc"] = float(line["value"])
                except (TypeError, ValueError):
                    pass
                break

        return result
    except (json.JSONDecodeError, AttributeError):
        return {}


def _doc_to_out(
    offer_id: UUID,
    status: str,
    doc: dict,
    generated_at=None,
) -> OfferDocumentOut:
    sections = [
        OfferDocumentSection(heading=s.get("heading", ""), content=s.get("content", ""))
        for s in doc.get("sections", [])
    ]
    pricing = [
        PricingLine(label=p.get("label", ""), value=p.get("value", ""), unit=p.get("unit", ""))
        for p in doc.get("pricing", [])
    ]
    route_raw = doc.get("route") or {}
    client_raw = doc.get("client") or {}

    return OfferDocumentOut(
        offer_id=offer_id,
        status=status,
        title=doc.get("title"),
        reference=doc.get("reference"),
        date=doc.get("date"),
        validity_days=doc.get("validity_days"),
        sections=sections,
        pricing=pricing,
        route=OfferRoute(
            origin=route_raw.get("origin"),
            destination=route_raw.get("destination"),
            transport_mode=route_raw.get("transport_mode"),
            vehicle_type=route_raw.get("vehicle_type"),
            planned_date=route_raw.get("planned_date"),
        ) if route_raw else None,
        client=OfferClient(
            name=client_raw.get("name"),
            odoo_partner_id=client_raw.get("odoo_partner_id"),
        ) if client_raw else None,
        footer=doc.get("footer"),
        document_generated_at=generated_at,
        parse_error=doc.get("parse_error", False),
    )
