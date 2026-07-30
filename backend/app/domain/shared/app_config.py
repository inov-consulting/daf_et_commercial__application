"""Domaine : configuration applicative Portalis.

Singleton en base. Contient les sous-sections :
- validators   : utilisateurs désignés pour valider offres et CR
- smtp         : configuration email pour les notifications
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass
class ValidatorsConfig:
    """Utilisateurs désignés comme validateurs métier."""
    offer_validator_user_id: UUID | None = None
    """ID (Portalis) de l'utilisateur qui valide les offres de transport."""

    cr_validator_user_id: UUID | None = None
    """ID (Portalis) de l'utilisateur qui valide les comptes rendus."""


@dataclass
class SmtpConfig:
    """Paramètres SMTP pour l'envoi des notifications par email."""
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    use_tls: bool = True
    from_email: str = ""
    from_name: str = "Portalis"


@dataclass
class AppConfig:
    id: UUID
    validators: ValidatorsConfig = field(default_factory=ValidatorsConfig)
    smtp: SmtpConfig = field(default_factory=SmtpConfig)
    created_at: datetime | None = None
    updated_at: datetime | None = None
