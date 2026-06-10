"""Schémas Pydantic pour l'API Prospects."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProspectStatus(str, Enum):
    """Statuts du pipeline."""

    NOUVEAU = "nouveau"
    CONTACTE = "contacte"
    QUALIFIE = "qualifie"
    CONVERTI = "converti"
    PERDU = "perdu"


class ProspectStatusOut(BaseModel):
    """Pour les compteurs par statut."""

    nouveau: int = 0
    contacte: int = 0
    qualifie: int = 0
    converti: int = 0
    perdu: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# Base
# ═══════════════════════════════════════════════════════════════════════════════


class ProspectBase(BaseModel):
    """Champs communs Prospect Portalis."""

    portalis_sector: str | None = None
    portalis_notes: str | None = None


# ═══════════════════════════════════════════════════════════════════════════════
# Création
# ═══════════════════════════════════════════════════════════════════════════════


class ProspectCreate(BaseModel):
    """Payload création nouveau prospect.

    Crée à la fois dans Odoo (crm.lead) et Portalis (prospects).
    """

    # Entreprise/Contact (va dans crm.lead Odoo)
    company_name: str = Field(..., min_length=1, description="Nom entreprise")
    contact_name: str | None = Field(None, description="Nom du contact")
    email: str | None = Field(None, description="Email contact")
    phone: str | None = Field(None, description="Téléphone")

    # Attribution (crm.lead.user_id / team_id)
    user_id: int | None = Field(None, description="ID Odoo commercial assigné")
    team_id: int | None = Field(None, description="ID Odoo équipe commerciale")

    # Classification Portalis
    portalis_sector: str | None = Field(None, description="Secteur d'activité")
    expected_revenue: int = Field(0, description="Montant pipeline estimé FCFA")


# ═══════════════════════════════════════════════════════════════════════════════
# Update
# ═══════════════════════════════════════════════════════════════════════════════


class ProspectUpdate(BaseModel):
    """Mise à jour partielle prospect.

    Champs Odoo natifs modifiés directement dans Odoo.
    Champs Portalis modifiés en local.
    """

    # Champs Portalis (locaux)
    portalis_sector: str | None = None
    portalis_notes: str | None = None

    # Champs Odoo (transmis à Odoo)
    company_name: str | None = Field(None, min_length=1)
    contact_name: str | None = None
    email: str | None = None
    phone: str | None = None
    user_id: int | None = None
    team_id: int | None = None
    expected_revenue: int | None = None


class ProspectStatusUpdate(BaseModel):
    """Changement de statut pipeline."""

    status: ProspectStatus
    reason: str | None = Field(None, description="Motif changement ou perte")


# ═══════════════════════════════════════════════════════════════════════════════
# Output (API Response)
# ═══════════════════════════════════════════════════════════════════════════════


class ProspectOut(BaseModel):
    """Prospect complet pour l'API.

    Merge données Portalis (DB locale) + Odoo (lus en temps réel ou cache).
    """

    model_config = ConfigDict(from_attributes=True)

    # Identifiants
    id: UUID
    odoo_lead_id: int

    # ── Données Portalis (stockées localement) ─────────────────────────────────
    status: ProspectStatus
    status_label: str  # "Nouveau", "Contacté"...
    portalis_sector: str | None
    portalis_notes: str | None
    status_changed_at: datetime
    pipeline_age_days: int  # Calculé: now - status_changed_at

    # ── Données Odoo (lues via sync ou temps réel) ─────────────────────────────
    # Entreprise/Contact (crm.lead / res.partner)
    company_name: str
    contact_name: str | None
    email: str | None
    phone: str | None

    # Commercial (crm.lead.user_id / team_id)
    assigned_to_id: int | None
    assigned_to_name: str | None
    team_id: int | None
    team_name: str | None

    # KPIs (crm.lead)
    expected_revenue: int  # FCFA
    probability: int  # %
    priority: str | None  # "0", "1", "2", "3"

    # Classification Odoo (crm.lead.tag_ids)
    odoo_tags: list[str] = []

    # Métadonnées
    created_at: datetime
    updated_at: datetime
    last_sync_at: datetime | None


class ProspectDetailOut(ProspectOut):
    """Prospect avec historique complet."""

    activities: list["ProspectActivityOut"] = []


# ═══════════════════════════════════════════════════════════════════════════════
# Activités (Timeline)
# ═══════════════════════════════════════════════════════════════════════════════


class ProspectActivityOut(BaseModel):
    """Événement timeline prospect."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    activity_type: str  # 'status_change', 'note', 'call', 'email', 'created'
    description: str | None
    performed_by: UUID | None
    performed_by_name: str | None
    created_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# List & Pagination
# ═══════════════════════════════════════════════════════════════════════════════


class ProspectListOut(BaseModel):
    """Liste paginée avec agrégations."""

    items: list[ProspectOut]
    total: int
    limit: int
    offset: int

    # Agrégations pour les filtres UI
    by_status: ProspectStatusOut
    total_pipeline_value: int  # Somme FCFA


class ProspectFilters(BaseModel):
    """Paramètres de filtre pour GET /prospects."""

    status: ProspectStatus | None = None
    team_id: int | None = None
    user_id: int | None = None
    portalis_sector: str | None = None
    search: str | None = Field(None, description="Recherche nom entreprise/contact/email")
    min_expected_revenue: int | None = None
    max_age_days: int | None = None
    sort_by: str = "created_at"  # created_at, updated_at, expected_revenue, status_changed_at
    sort_order: str = "desc"  # asc, desc
    limit: int = 50
    offset: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# Actions (Transitions)
# ═══════════════════════════════════════════════════════════════════════════════


class ProspectAction(str, Enum):
    """Actions possibles sur un prospect."""

    CONTACT = "contact"
    QUALIFY = "qualify"
    CONVERT = "convert"
    LOSE = "lose"


class ProspectActionRequest(BaseModel):
    """Request pour exécuter une action sur un prospect."""

    action: ProspectAction = Field(..., description="Action à exécuter: contact, qualify, convert, lose")
    lost_reason_id: int | None = Field(None, description="ID Odoo crm.lost.reason (pour action=lose)")
    custom_reason: str | None = Field(None, description="Motif personnalisé (pour action=lose)")


class ProspectConvertOut(BaseModel):
    """Réponse conversion prospect → client/opportunité."""

    prospect: ProspectOut
    odoo_opportunity_id: int | None
    odoo_partner_id: int | None  # Client créé
    message: str


class ProspectLoseRequest(BaseModel):
    """Request marquer comme perdu."""

    lost_reason_id: int | None = Field(None, description="ID Odoo crm.lost.reason")
    custom_reason: str | None = Field(None, description="Motif personnalisé si pas dans Odoo")


class SyncStatusOut(BaseModel):
    """État de la synchronisation Odoo."""

    last_sync_at: datetime | None
    synced_count: int
    pending_sync_count: int
    errors: list[str] = []
