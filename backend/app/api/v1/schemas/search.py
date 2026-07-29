"""Schémas Pydantic pour l'endpoint de recherche globale GET /search."""
from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field

SearchType = Literal["prospect", "transport", "offre", "compte_rendu"]


# ── Navigation (identique pour tous les types) ─────────────────────────────────

class SearchNav(BaseModel):
    """Données de navigation : le frontend construit le lien détail à partir de ces champs.

    Tableau de correspondance type → route → params :

    | type          | route                    | params  |
    |---------------|--------------------------|---------|
    | prospect      | prospects.detail         | { id }  |
    | transport     | transport.mission.detail | { id }  |
    | offre         | transport.offre.detail   | { id }  |
    | compte_rendu  | compte_rendus.detail     | { id }  |
    """

    route: str = Field(
        ...,
        description="Nom logique de la route frontend vers la page détail.",
        examples=["prospects.detail", "transport.mission.detail"],
    )
    params: dict[str, Any] = Field(
        ...,
        description="Paramètres de la route. Contient toujours `id` (UUID Portalis ou entier Odoo).",
        examples=[{"id": "550e8400-e29b-41d4-a716-446655440000"}, {"id": 412}],
    )


# ── Extra data typées par catégorie ───────────────────────────────────────────

class ProspectExtra(BaseModel):
    """Données complémentaires d'un résultat de type `prospect`."""

    status: str | None = Field(
        None,
        description="Statut Portalis du prospect : nouveau | en_cours | converti | perdu.",
    )
    status_label: str = Field(
        ...,
        description="Libellé lisible du statut (ex: 'En cours').",
    )
    odoo_lead_id: int = Field(
        ...,
        description="ID du lead dans Odoo CRM (crm.lead).",
    )
    partner_name: str = Field(
        default="",
        description="Nom du client / entreprise associée au lead.",
    )
    email: str = Field(
        default="",
        description="Email du contact (email_from dans Odoo).",
    )
    portalis_id: str | None = Field(
        None,
        description="UUID Portalis du prospect (null si jamais synchronisé).",
    )
    synced: bool = Field(
        ...,
        description="True si le lead Odoo a une entrée correspondante dans Portalis.",
    )


class TransportExtra(BaseModel):
    """Données complémentaires d'un résultat de type `transport` (dossier transport.shipment Odoo)."""

    odoo_id: int = Field(
        ...,
        description="ID du dossier dans Odoo (transport.shipment).",
    )
    state: str = Field(
        ...,
        description="Statut technique Odoo : draft | confirmed | in_progress | done | cancelled.",
    )
    state_label: str = Field(
        ...,
        description="Libellé lisible du statut (ex: 'En cours').",
    )
    partner_name: str = Field(
        default="",
        description="Nom du client (partner_id Odoo).",
    )
    date_order: str = Field(
        default="",
        description="Date de création du dossier (format YYYY-MM-DD).",
    )
    sale_amount: str = Field(
        default="",
        description="Montant de vente formaté avec devise (ex: '2 500 000 XOF').",
    )


class OffreExtra(BaseModel):
    """Données complémentaires d'un résultat de type `offre` (transport_offers Portalis)."""

    status: str = Field(
        ...,
        description="Statut de l'offre : draft | completed | generated | confirmed | cancelled.",
    )
    status_label: str = Field(
        ...,
        description="Libellé lisible du statut (ex: 'Doc. généré').",
    )
    session_id: str = Field(
        ...,
        description="UUID de la session LangGraph de conversation ayant généré cette offre.",
    )
    odoo_shipment_id: int | None = Field(
        None,
        description="ID du dossier Odoo créé après confirmation (null si non encore confirmée).",
    )
    odoo_shipment_name: str | None = Field(
        None,
        description="Référence Odoo du dossier (ex: 'SHIP/2026/0042'). Null si non confirmée.",
    )
    client_name: str = Field(
        default="",
        description="Nom du client extrait des données collectées pendant la conversation.",
    )
    trajet: str = Field(
        default="",
        description="Trajet formaté origine → destination (ex: 'Dakar → Abidjan').",
    )


class CompteRenduExtra(BaseModel):
    """Données complémentaires d'un résultat de type `compte_rendu`."""

    parent_type: str = Field(
        ...,
        description="Type de l'entité parente : prospect | service.",
    )
    parent_id: str = Field(
        ...,
        description="UUID de l'entité parente (prospect ou service).",
    )
    version: int = Field(
        ...,
        description="Numéro de version du compte-rendu (commence à 1).",
    )
    status: str = Field(
        ...,
        description="Statut du document : draft | final.",
    )
    generation_status: str = Field(
        ...,
        description="Statut de génération IA : pending | running | done | failed.",
    )
    generated_by: str = Field(
        ...,
        description="Origine de la génération : ai | user.",
    )


# ── Item de résultat ──────────────────────────────────────────────────────────

AnyExtra = Annotated[
    ProspectExtra | TransportExtra | OffreExtra | CompteRenduExtra,
    Field(discriminator=None, description="Données typées selon `type`."),
]


class SearchResultItem(BaseModel):
    """Un résultat de recherche. Le champ `extra` est toujours typé selon `type`."""

    type: SearchType = Field(
        ...,
        description="Catégorie : prospect | transport | offre | compte_rendu.",
    )
    id: str = Field(
        ...,
        description="Identifiant principal (UUID Portalis ou ID entier Odoo selon le type).",
    )
    label: str = Field(
        ...,
        description="Titre principal affiché dans la liste de résultats.",
    )
    subtitle: str = Field(
        default="",
        description="Ligne secondaire (statut, client, date…).",
    )
    nav: SearchNav = Field(
        ...,
        description="Route et paramètres pour naviguer vers la page détail.",
    )
    extra: ProspectExtra | TransportExtra | OffreExtra | CompteRenduExtra = Field(
        ...,
        description=(
            "Données complémentaires typées selon `type` : "
            "ProspectExtra | TransportExtra | OffreExtra | CompteRenduExtra."
        ),
    )


# ── Réponse globale ───────────────────────────────────────────────────────────

class SearchOut(BaseModel):
    """Réponse de l'endpoint GET /search."""

    query: str = Field(..., description="Terme recherché (retourné tel quel).")
    total: int = Field(..., description="Nombre total de résultats toutes catégories confondues.")
    per_type: dict[str, int] = Field(
        ...,
        description="Décompte par catégorie : {prospect: 2, transport: 3, offre: 0, compte_rendu: 1}.",
    )
    results: list[SearchResultItem] = Field(
        ...,
        description=(
            "Liste plate triée par catégorie : prospects → transport → offres → compte_rendus."
        ),
    )
