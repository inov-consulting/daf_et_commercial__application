"""Router API : offres transport générées par conversation IA ou formulaire.

Flux IA :
  POST /offers/chat              → tour de conversation (collecte ou génération)
  POST /offers/{id}/generate     → génère le document Markdown via Claude
  POST /offers/{id}/confirm      → valide + crée le dossier Odoo via MCP

Flux formulaire :
  POST /offers/form              → crée une offre directement (bypass IA, statut completed)
  PATCH /offers/{id}/form        → modifie les données d'une offre (IA ou formulaire)

Commun :
  GET  /offers/{id}              → détail d'une offre
  GET  /offers/                  → liste des offres
  POST /offers/{id}/cancel       → annule une offre
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import CurrentCompany, get_current_user, require_permission
from app.api.v1.schemas.transport_offer import (
    OfferChatIn,
    OfferChatOut,
    OfferConfirmOut,
    OfferDocumentOut,
    OfferDocumentSection,
    OfferFormIn,
    OfferRoute,
    OfferClient,
    OdooClientOut,
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
    company: CurrentCompany,
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
        offer = await repo.create(session_id=session_id, user_id=current_user.id, company_id=company.id)
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


# ── Formulaire (création & modification) ─────────────────────────────────────

@router.post("/form", dependencies=_write_deps, status_code=status.HTTP_201_CREATED)
async def create_offer_form(
    body: OfferFormIn,
    company: CurrentCompany,
    current_user=Depends(get_current_user),
) -> OfferSummaryOut:
    """Crée une offre transport directement via formulaire (sans IA).

    Tous les champs sont optionnels pour la création — le statut est `completed`
    dès la création, ce qui permet d'appeler immédiatement `POST /{id}/generate`
    pour générer le document.

    Règle de validation : `vehicle_type` est obligatoire si `transport_mode = terrestre`.
    """
    repo = TransportOfferRepository()
    offer = await repo.create_manual(
        collected_data=body.to_collected_data(),
        user_id=current_user.id,
        company_id=company.id,
    )
    return OfferSummaryOut(
        id=offer.id,
        session_id=offer.session_id,
        status=offer.status,
        **_extract_doc_summary(offer.document_markdown, offer.collected_data),
        odoo_shipment_id=offer.odoo_shipment_id,
        odoo_shipment_name=offer.odoo_shipment_name,
        created_at=offer.created_at,
        confirmed_at=offer.confirmed_at,
    )


@router.patch("/{offer_id}/form", dependencies=_write_deps)
async def update_offer_form(
    offer_id: UUID,
    body: OfferFormIn,
) -> OfferSummaryOut:
    """Modifie les données d'une offre via formulaire (offre IA ou manuelle).

    - Fusionne les champs fournis avec les données existantes (PATCH partiel).
    - Si l'offre avait un document déjà généré (`generated` / `validated`),
      le document est effacé et le statut revient à `completed` : l'utilisateur
      devra relancer `POST /{id}/generate` pour obtenir un document à jour.
    - Les offres `confirmed` ou `cancelled` ne peuvent pas être modifiées (409).
    """
    repo = TransportOfferRepository()

    existing = await repo.get(offer_id)
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre non trouvée")
    if existing.status in ("confirmed", "cancelled"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "code": "OFFER_NOT_EDITABLE",
                "message": f"L'offre est en statut '{existing.status}' et ne peut plus être modifiée.",
            },
        )

    offer = await repo.update_form(offer_id, body.to_collected_data())
    if not offer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre non trouvée")

    return OfferSummaryOut(
        id=offer.id,
        session_id=offer.session_id,
        status=offer.status,
        **_extract_doc_summary(offer.document_markdown, offer.collected_data),
        odoo_shipment_id=offer.odoo_shipment_id,
        odoo_shipment_name=offer.odoo_shipment_name,
        created_at=offer.created_at,
        confirmed_at=offer.confirmed_at,
    )


# ── Partenaires Odoo (clients & fournisseurs) ────────────────────────────────

@router.get("/customers", dependencies=_read_deps)
async def list_odoo_clients(
    search: str = "",
    companies_only: bool = Query(False, description="true = entreprises uniquement, false = tous (entreprises + particuliers)"),
) -> list[OdooClientOut]:
    """Retourne les clients Odoo (customer_rank > 0) pour la liste déroulante du formulaire.

    Chaque entrée contient : nom, type (entreprise/particulier), email, téléphone,
    mobile, adresse complète (rue, ville, code postal, pays).
    """
    from app.infrastructure.ai.tools.odoo_client_list import list_odoo_clients as _odoo_partners
    records = await _odoo_partners(search=search, companies_only=companies_only, suppliers=False)
    return [OdooClientOut(**r) for r in records]


@router.get("/suppliers", dependencies=_read_deps)
async def list_odoo_suppliers(
    search: str = "",
    companies_only: bool = Query(False, description="true = entreprises uniquement, false = tous (entreprises + particuliers)"),
) -> list[OdooClientOut]:
    """Retourne les fournisseurs Odoo (supplier_rank > 0).

    Même structure que /customers : nom, type, email, téléphone, mobile, adresse.
    """
    from app.infrastructure.ai.tools.odoo_client_list import list_odoo_clients as _odoo_partners
    records = await _odoo_partners(search=search, companies_only=companies_only, suppliers=True)
    return [OdooClientOut(**r) for r in records]


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
        company_id=offer.company_id,
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

    Prérequis : l'offre doit être au statut `validated`.
    """
    repo = TransportOfferRepository()
    offer = await repo.get(offer_id)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre non trouvée")
    if offer.status != "validated":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"L'offre doit être au statut 'validated' (actuel: {offer.status}). Validez d'abord le document.",
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

    return _doc_to_out(
        offer_id,
        offer.status,
        doc,
        generated_at=offer.document_generated_at,
        collected_data=offer.collected_data,
    )


@router.get("/", dependencies=_read_deps)
async def list_offers(
    company: CurrentCompany,
    current_user=Depends(get_current_user),
) -> list[OfferSummaryOut]:
    """Liste les offres de l'entreprise courante."""
    repo = TransportOfferRepository()
    offers = await repo.list(current_user.id, company_id=company.id)
    return [
        OfferSummaryOut(
            id=o.id,
            session_id=o.session_id,
            status=o.status,
            **_extract_doc_summary(o.document_markdown, o.collected_data),
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
        **_extract_doc_summary(offer.document_markdown, offer.collected_data),
        odoo_shipment_id=offer.odoo_shipment_id,
        odoo_shipment_name=offer.odoo_shipment_name,
        created_at=offer.created_at,
        confirmed_at=offer.confirmed_at,
    )


# ── Helper ────────────────────────────────────────────────────────────────────

def _extract_collected_data_summary(collected_data: dict | None) -> dict:
    """Construit un résumé depuis collected_data quand le document n'est pas encore généré."""
    from app.api.v1.schemas.transport_offer import OfferRoute

    if not collected_data:
        return {}

    result: dict = {}

    # Titre synthétique
    client = collected_data.get("client_name")
    product = collected_data.get("product_description")
    if client or product:
        parts = [p for p in [client, product] if p]
        result["title"] = " — ".join(parts)

    if collected_data.get("validity_days") is not None:
        result["validity_days"] = collected_data["validity_days"]

    if collected_data.get("planned_date"):
        result["date"] = collected_data["planned_date"]

    if any(collected_data.get(k) for k in ("origin", "destination", "transport_mode", "vehicle_type", "planned_date")):
        result["route"] = OfferRoute(
            origin=collected_data.get("origin"),
            destination=collected_data.get("destination"),
            transport_mode=collected_data.get("transport_mode"),
            vehicle_type=collected_data.get("vehicle_type"),
            planned_date=collected_data.get("planned_date"),
        )

    # Estimation montant total (price_unit × quantity) quand disponible
    price = collected_data.get("price_unit")
    qty = collected_data.get("quantity")
    if price is not None and qty is not None:
        try:
            result["amount_ttc"] = float(price) * float(qty)
        except (TypeError, ValueError):
            pass

    return result


def _extract_doc_summary(document_markdown: str | None, collected_data: dict | None = None) -> dict:
    """Extrait les champs de résumé du document JSON sérialisé.

    Fallback sur collected_data quand le document n'est pas encore généré.
    """
    import json
    if not document_markdown:
        return _extract_collected_data_summary(collected_data)
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
    collected_data: dict | None = None,
) -> OfferDocumentOut:
    cd = collected_data or {}
    sections = [
        OfferDocumentSection(heading=s.get("heading", ""), content=s.get("content", ""))
        for s in doc.get("sections", [])
    ]
    pricing = [
        PricingLine(label=p.get("label", ""), value=p.get("value", ""), unit=p.get("unit", ""))
        for p in doc.get("pricing", [])
    ]

    # Route : document généré en priorité, sinon collected_data
    route_raw = doc.get("route") or {}
    route = OfferRoute(
        origin=route_raw.get("origin") or cd.get("origin"),
        destination=route_raw.get("destination") or cd.get("destination"),
        transport_mode=route_raw.get("transport_mode") or cd.get("transport_mode"),
        vehicle_type=route_raw.get("vehicle_type") or cd.get("vehicle_type"),
        planned_date=route_raw.get("planned_date") or cd.get("planned_date"),
    ) if (route_raw or any(cd.get(k) for k in ("origin", "destination", "transport_mode"))) else None

    # Client : document généré en priorité, sinon collected_data
    client_raw = doc.get("client") or {}
    client = OfferClient(
        name=client_raw.get("name") or cd.get("client_name"),
        odoo_partner_id=client_raw.get("odoo_partner_id") or cd.get("odoo_partner_id"),
    ) if (client_raw or cd.get("client_name") or cd.get("odoo_partner_id")) else None

    # Titre synthétique depuis collected_data si le document n'en a pas
    title = doc.get("title")
    if not title and cd:
        parts = [p for p in [cd.get("client_name"), cd.get("product_description")] if p]
        title = " — ".join(parts) if parts else None

    return OfferDocumentOut(
        offer_id=offer_id,
        status=status,
        title=title,
        reference=doc.get("reference"),
        date=doc.get("date") or cd.get("planned_date"),
        validity_days=doc.get("validity_days") or cd.get("validity_days"),
        sections=sections,
        pricing=pricing,
        route=route,
        client=client,
        footer=doc.get("footer"),
        document_generated_at=generated_at,
        parse_error=doc.get("parse_error", False),
    )
