"""Modèles ORM Tortoise."""

# AiModelOrm doit être importé avant AiConfigOrm (FK dependency)
from app.infrastructure.db.models.ai_config import AiConfigOrm, AiModelOrm
from app.infrastructure.db.models.app_config import AppConfigOrm
from app.infrastructure.db.models.kpi_group_access import KpiGroupAccessOrm
from app.infrastructure.db.models.api_log import ApiRequestLogOrm
from app.infrastructure.db.models.company import CompanyOrm
from app.infrastructure.db.models.note import CompteRenduOrm, NoteOrm
from app.infrastructure.db.models.prospect import ProspectActivityOrm, ProspectOrm
from app.infrastructure.db.models.transport_offer import TransportOfferOrm
from app.infrastructure.db.models.user import UserOrm

__all__ = [
    "AiConfigOrm",
    "AiModelOrm",
    "AppConfigOrm",
    "KpiGroupAccessOrm",
    "ApiRequestLogOrm",
    "CompanyOrm",
    "CompteRenduOrm",
    "NoteOrm",
    "ProspectActivityOrm",
    "ProspectOrm",
    "TransportOfferOrm",
    "UserOrm",
]
