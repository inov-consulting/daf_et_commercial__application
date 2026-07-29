"""Schémas Pydantic : configuration applicative Portalis."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ── Sous-sections ──────────────────────────────────────────────────────────────

class ValidatorsConfigIn(BaseModel):
    offer_validator_user_id: UUID | None = Field(
        None,
        description="ID Portalis de l'utilisateur validateur des offres de transport",
    )
    cr_validator_user_id: UUID | None = Field(
        None,
        description="ID Portalis de l'utilisateur validateur des comptes rendus",
    )


class ValidatorInfo(BaseModel):
    id: UUID
    display_name: str | None = None


class ValidatorsConfigOut(BaseModel):
    offer_validator: ValidatorInfo | None = Field(
        None,
        description="Validateur des offres de transport (id + nom)",
    )
    cr_validator: ValidatorInfo | None = Field(
        None,
        description="Validateur des comptes rendus (id + nom)",
    )


class SmtpConfigIn(BaseModel):
    host: str = Field("", description="Serveur SMTP (ex: smtp.gmail.com)")
    port: int = Field(587, description="Port SMTP (587 TLS, 465 SSL, 25 non chiffré)")
    username: str = Field("", description="Identifiant SMTP")
    password: str = Field("", description="Mot de passe SMTP (stocké chiffré)")
    use_tls: bool = Field(True, description="Activer STARTTLS")
    from_email: str = Field("", description="Adresse expéditeur (ex: noreply@inov.com)")
    from_name: str = Field("Portalis", description="Nom affiché de l'expéditeur")


class SmtpConfigOut(BaseModel):
    host: str
    port: int
    username: str
    use_tls: bool
    from_email: str
    from_name: str
    password: str = Field("", description="Toujours masqué en lecture (vide si non défini)")


# ── Requêtes ──────────────────────────────────────────────────────────────────

class AppConfigValidatorsIn(BaseModel):
    validators: ValidatorsConfigIn


class AppConfigSmtpIn(BaseModel):
    smtp: SmtpConfigIn


# ── Réponses ──────────────────────────────────────────────────────────────────

class AppConfigOut(BaseModel):
    id: UUID
    validators: ValidatorsConfigOut
    smtp: SmtpConfigOut
    updated_at: datetime | None = None


class CompanyValidatorsOut(BaseModel):
    company_id: UUID
    offer_validator: ValidatorInfo | None = None
    cr_validator: ValidatorInfo | None = None


class CompanyValidatorsIn(BaseModel):
    offer_validator_user_id: UUID | None = Field(
        None,
        description="ID Portalis du validateur des offres pour cette entreprise",
    )
    cr_validator_user_id: UUID | None = Field(
        None,
        description="ID Portalis du validateur des comptes rendus pour cette entreprise",
    )
