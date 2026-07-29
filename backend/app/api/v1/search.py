"""Router /search : recherche globale multi-entités.

GET /api/v1/search?q=dakar&limit=5

Recherche en parallèle dans 4 sources :
  - prospect      → Odoo crm.lead  (name / partner_name ilike)
  - transport     → Odoo transport.shipment (name ilike)
  - offre         → Portalis DB transport_offers (odoo_shipment_name / document_markdown)
  - compte_rendu  → Portalis DB compte_rendus (content)

Chaque résultat contient :
  - `nav`   : route frontend + params pour construire le lien détail
  - `extra` : données typées selon le type (ProspectExtra, TransportExtra, etc.)
"""
from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentCompany, get_current_user
from app.api.v1.schemas.search import (
    CompteRenduExtra,
    OffreExtra,
    ProspectExtra,
    SearchNav,
    SearchOut,
    SearchResultItem,
    TransportExtra,
)
from app.core.logging import get_logger
from app.domain.shared.company import Company

logger = get_logger(__name__)

router = APIRouter(prefix="/search", tags=["search"])

_PROSPECT_STATUS = {
    "nouveau": "Nouveau",
    "en_cours": "En cours",
    "converti": "Converti",
    "perdu": "Perdu",
}
_SHIPMENT_STATE = {
    "draft": "Brouillon",
    "confirmed": "Confirmé",
    "in_progress": "En cours",
    "done": "Terminé",
    "cancelled": "Annulé",
}
_OFFER_STATUS = {
    "draft": "Brouillon",
    "completed": "Complétée",
    "generated": "Doc. généré",
    "confirmed": "Confirmée",
    "cancelled": "Annulée",
}


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.get("")
async def global_search(
    company: CurrentCompany,
    _user=Depends(get_current_user),
    q: Annotated[str, Query(min_length=3, description="Terme à rechercher (min 3 caractères)")] = ...,
    limit: Annotated[int, Query(ge=1, le=20, description="Nombre max de résultats par catégorie")] = 5,
) -> SearchOut:
    """Recherche globale — retourne jusqu'à `limit` résultats par catégorie en parallèle.

    Chaque item contient :
    - `nav.route` + `nav.params` → lien vers la page détail
    - `extra` → données typées selon `type` (ProspectExtra, TransportExtra, OffreExtra, CompteRenduExtra)

    Exemple :
    ```json
    {
      "query": "dakar",
      "total": 4,
      "per_type": {"prospect": 1, "transport": 2, "offre": 1, "compte_rendu": 0},
      "results": [
        {
          "type": "prospect",
          "id": "550e8400-...",
          "label": "Dakar Logistics SA",
          "subtitle": "En cours · Pipeline",
          "nav": { "route": "prospects.detail", "params": { "id": "550e8400-..." } },
          "extra": {
            "status": "en_cours",
            "status_label": "En cours",
            "odoo_lead_id": 42,
            "partner_name": "Dakar Logistics SA",
            "email": "contact@dakar-log.sn",
            "portalis_id": "550e8400-...",
            "synced": true
          }
        },
        {
          "type": "transport",
          "id": "412",
          "label": "DOS-2026-0412",
          "subtitle": "Confirmé · Dakar Logistics",
          "nav": { "route": "transport.mission.detail", "params": { "id": 412 } },
          "extra": {
            "odoo_id": 412,
            "state": "confirmed",
            "state_label": "Confirmé",
            "partner_name": "Dakar Logistics SA",
            "date_order": "2026-07-15",
            "sale_amount": "2 500 000 XOF"
          }
        }
      ]
    }
    ```
    """
    prospects, missions, offres, documents = await asyncio.gather(
        _search_prospects(q, company, limit),
        _search_missions(q, company, limit),
        _search_offres(q, company, limit),
        _search_documents(q, company, limit),
        return_exceptions=True,
    )

    def _safe(result, label: str) -> list[SearchResultItem]:
        if isinstance(result, Exception):
            logger.warning("search.%s.failed q=%s error=%s", label, q, result)
            return []
        return result  # type: ignore[return-value]

    p = _safe(prospects, "prospects")
    t = _safe(missions, "transport")
    o = _safe(offres, "offres")
    d = _safe(documents, "compte_rendus")

    return SearchOut(
        query=q,
        total=len(p) + len(t) + len(o) + len(d),
        per_type={
            "prospect": len(p),
            "transport": len(t),
            "offre": len(o),
            "compte_rendu": len(d),
        },
        results=p + t + o + d,
    )


# ── Recherche prospects ────────────────────────────────────────────────────────

async def _search_prospects(q: str, company: Company, limit: int) -> list[SearchResultItem]:
    from app.infrastructure.db.models.prospect import ProspectOrm
    from app.infrastructure.odoo.client import OdooClient

    domain: list = ["|", ("name", "ilike", q), ("partner_name", "ilike", q)]
    if company.erp_id:
        domain = [("company_id", "=", company.erp_id)] + domain

    client = OdooClient()
    leads: list[dict] = await asyncio.to_thread(
        client.execute,
        "crm.lead",
        "search_read",
        [domain],
        {"fields": ["id", "name", "partner_name", "email_from", "stage_id"], "limit": limit},
    )

    if not leads:
        return []

    odoo_ids = [lead["id"] for lead in leads]
    portalis_rows = await ProspectOrm.filter(odoo_lead_id__in=odoo_ids, company_id=company.id)
    portalis_map = {p.odoo_lead_id: p for p in portalis_rows}

    results: list[SearchResultItem] = []
    for lead in leads:
        p = portalis_map.get(lead["id"])
        portalis_id = str(p.id) if p else None
        status = p.status if p else None
        status_label = _PROSPECT_STATUS.get(status or "", status or "non synchronisé")
        partner = lead.get("partner_name") or ""
        stage = lead.get("stage_id", [None, ""])[1] if lead.get("stage_id") else ""

        results.append(SearchResultItem(
            type="prospect",
            id=portalis_id or str(lead["id"]),
            label=lead.get("name") or partner or f"Lead #{lead['id']}",
            subtitle=f"{status_label} · {stage}".strip(" ·"),
            nav=SearchNav(
                route="prospects.detail",
                params={"id": portalis_id} if portalis_id else {},
            ),
            extra=ProspectExtra(
                status=status,
                status_label=status_label,
                odoo_lead_id=lead["id"],
                partner_name=partner,
                email=lead.get("email_from") or "",
                portalis_id=portalis_id,
                synced=portalis_id is not None,
            ),
        ))
    return results


# ── Recherche transport ────────────────────────────────────────────────────────

async def _search_missions(q: str, company: Company, limit: int) -> list[SearchResultItem]:
    from app.infrastructure.odoo.client import OdooClient

    domain: list = [("name", "ilike", q)]
    if company.erp_id:
        domain.insert(0, ("company_id", "=", company.erp_id))

    client = OdooClient()
    shipments: list[dict] = await asyncio.to_thread(
        client.execute,
        "transport.shipment",
        "search_read",
        [domain],
        {"fields": ["id", "name", "state", "partner_id", "date_order", "sale_amount"], "limit": limit},
    )

    results: list[SearchResultItem] = []
    for s in shipments:
        state = s.get("state") or ""
        state_label = _SHIPMENT_STATE.get(state, state)
        partner = s.get("partner_id", [None, ""])[1] if s.get("partner_id") else ""
        date_str = str(s.get("date_order") or "")[:10]
        amount = s.get("sale_amount")
        amount_str = f"{amount:,.0f} XOF" if amount else ""

        results.append(SearchResultItem(
            type="transport",
            id=str(s["id"]),
            label=s.get("name") or f"Dossier #{s['id']}",
            subtitle=f"{state_label} · {partner}".strip(" ·"),
            nav=SearchNav(
                route="transport.mission.detail",
                params={"id": s["id"]},
            ),
            extra=TransportExtra(
                odoo_id=s["id"],
                state=state,
                state_label=state_label,
                partner_name=partner,
                date_order=date_str,
                sale_amount=amount_str,
            ),
        ))
    return results


# ── Recherche offres ───────────────────────────────────────────────────────────

async def _search_offres(q: str, company: Company, limit: int) -> list[SearchResultItem]:
    from tortoise.expressions import Q

    from app.infrastructure.db.models.transport_offer import TransportOfferOrm

    offers = await (
        TransportOfferOrm
        .filter(company_id=company.id)
        .filter(Q(odoo_shipment_name__icontains=q) | Q(document_markdown__icontains=q))
        .order_by("-created_at")
        .limit(limit)
    )

    results: list[SearchResultItem] = []
    for o in offers:
        status_label = _OFFER_STATUS.get(o.status, o.status)
        label = o.odoo_shipment_name or f"Offre {str(o.id)[:8]}"
        data = o.collected_data or {}
        client_name = data.get("client_name") or data.get("client") or data.get("nom_client") or ""
        origine = data.get("origine") or data.get("origin") or ""
        destination = data.get("destination") or ""
        trajet = f"{origine} → {destination}" if origine and destination else ""

        results.append(SearchResultItem(
            type="offre",
            id=str(o.id),
            label=label,
            subtitle=f"{status_label} · {client_name or trajet}".strip(" ·"),
            nav=SearchNav(
                route="transport.offre.detail",
                params={"id": str(o.id)},
            ),
            extra=OffreExtra(
                status=o.status,
                status_label=status_label,
                session_id=str(o.session_id),
                odoo_shipment_id=o.odoo_shipment_id,
                odoo_shipment_name=o.odoo_shipment_name,
                client_name=client_name,
                trajet=trajet,
            ),
        ))
    return results


# ── Recherche compte-rendus ────────────────────────────────────────────────────

async def _search_documents(q: str, company: Company, limit: int) -> list[SearchResultItem]:
    from tortoise.expressions import Q

    from app.infrastructure.db.models.note import CompteRenduOrm

    docs = await (
        CompteRenduOrm
        .filter(company_id=company.id)
        .filter(Q(content__icontains=q))
        .order_by("-created_at")
        .limit(limit)
    )

    results: list[SearchResultItem] = []
    for d in docs:
        date_str = d.created_at.strftime("%d %b %Y") if d.created_at else ""

        results.append(SearchResultItem(
            type="compte_rendu",
            id=str(d.id),
            label=f"Compte-rendu v{d.version} · {d.parent_type}",
            subtitle=f"{date_str} · {d.status}",
            nav=SearchNav(
                route="compte_rendus.detail",
                params={"id": str(d.id)},
            ),
            extra=CompteRenduExtra(
                parent_type=d.parent_type,
                parent_id=str(d.parent_id),
                version=d.version,
                status=d.status,
                generation_status=d.generation_status,
                generated_by=d.generated_by,
            ),
        ))
    return results
