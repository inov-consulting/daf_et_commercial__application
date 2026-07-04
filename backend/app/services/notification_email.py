"""Service d'envoi d'email de notification via SMTP.

Utilise la configuration SMTP stockée dans AppConfig (table app_config).
Les envois sont best-effort : une erreur n'interrompt pas le flux métier.
"""
from __future__ import annotations

import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from uuid import UUID

from app.core.logging import get_logger

logger = get_logger(__name__)

_GREEN = "#2d5a27"
_LIGHT_GREEN = "#f0f5ee"


def _base_template(
    recipient_name: str,
    intro: str,
    rows: list[tuple[str, str]],
    cta_label: str | None = None,
    cta_url: str | None = None,
    info_box: str | None = None,
    signature: str = "L'équipe PortaLis",
) -> str:
    """Template HTML PortaLis — reprend la charte de l'email de référence."""

    rows_html = "".join(
        f"""
        <tr>
          <td style="padding:12px 16px;color:#6b7280;border-bottom:1px solid #e5e7eb;white-space:nowrap">{label}</td>
          <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e5e7eb;text-align:right">{value}</td>
        </tr>"""
        for label, value in rows
    )

    cta_html = (
        f"""
        <div style="text-align:center;margin:32px 0">
          <a href="{cta_url}" style="display:inline-block;background:{_GREEN};color:#ffffff;
             text-decoration:none;padding:14px 32px;border-radius:8px;
             font-weight:700;font-size:15px;letter-spacing:.3px">
            {cta_label}
          </a>
        </div>"""
        if cta_label and cta_url else ""
    )

    info_html = (
        f"""
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;
             padding:14px 18px;margin:24px 0;color:#92400e;font-size:14px">
          ⚠️&nbsp; {info_box}
        </div>"""
        if info_box else ""
    )

    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(0,0,0,.1)">

        <!-- Header barre verte -->
        <tr>
          <td style="background:{_GREEN};padding:6px 0"></td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:40px 48px">

            <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111827">
              Bonjour {recipient_name},
            </h1>

            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151">
              {intro}
            </p>

            {cta_html}
            {info_html}

            <!-- Tableau de détails -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;border-radius:8px;
                          border-collapse:separate;overflow:hidden;margin:24px 0">
              {rows_html}
            </table>

            <p style="margin:24px 0 0;font-size:14px;color:#6b7280;font-style:italic">
              Vous n'êtes pas concerné par cette notification ?<br>
              Ignorez cet email ou contactez l'administrateur.
            </p>

            <p style="margin:32px 0 0;font-size:15px;color:#374151">
              Cordialement,<br>
              <strong>{signature}</strong>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:{_GREEN};padding:24px 48px;text-align:center">
            <p style="margin:0;color:#ffffff;font-weight:700;font-size:14px">PortaLis</p>
            <p style="margin:4px 0 0;color:#a7c49f;font-size:12px">
              Transport &amp; Logistique · Afrique de l'Ouest
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def _get_smtp_config():
    from app.infrastructure.db.repositories.app_config import AppConfigRepository
    config = await AppConfigRepository().get()
    return config.smtp


async def _get_keycloak_user(user_id: UUID) -> dict | None:
    """Récupère les données Keycloak d'un utilisateur."""
    try:
        from app.infrastructure.auth.keycloak import KeycloakAdminClient
        return await KeycloakAdminClient().get_user_by_id(str(user_id))
    except Exception as exc:
        logger.warning("notification.get_keycloak_user.failed user_id=%s error=%s", user_id, exc)
    return None


async def _get_validator_email(user_id: UUID) -> str | None:
    """Récupère l'email du validateur depuis Keycloak."""
    kc_user = await _get_keycloak_user(user_id)
    return (kc_user.get("email") or None) if kc_user else None


async def _get_validator_first_name(user_id: UUID) -> str | None:
    """Récupère le prénom du validateur depuis Keycloak (pour la salutation)."""
    kc_user = await _get_keycloak_user(user_id)
    return (kc_user.get("firstName") or None) if kc_user else None


def _send_smtp(smtp_cfg, to_email: str, subject: str, html_body: str) -> None:
    """Envoi synchrone SMTP (exécuté dans un thread)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{smtp_cfg.from_name} <{smtp_cfg.from_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    if smtp_cfg.use_tls:
        server = smtplib.SMTP(smtp_cfg.host, smtp_cfg.port, timeout=10)
        server.ehlo()
        server.starttls()
    else:
        server = smtplib.SMTP_SSL(smtp_cfg.host, smtp_cfg.port, timeout=10)

    if smtp_cfg.username:
        server.login(smtp_cfg.username, smtp_cfg.password)

    server.sendmail(smtp_cfg.from_email, to_email, msg.as_string())
    server.quit()


async def notify_offer_generated(
    offer_id: UUID,
    offer_title: str | None,
    author_name: str,
) -> list[str]:
    """Envoie un email au validateur désigné quand une offre transport est générée.

    Retourne une liste de warnings (non bloquants) à remonter dans la réponse API.
    """
    warnings: list[str] = []
    try:
        from app.infrastructure.db.repositories.app_config import AppConfigRepository
        config = await AppConfigRepository().get()
        smtp = config.smtp
        validator_id = config.validators.offer_validator_user_id

        if not validator_id:
            msg = (
                "Aucun validateur d'offres n'est configuré. "
                "Rendez-vous dans PATCH /api/v1/config/app/validators pour en désigner un."
            )
            logger.warning("notification.offer_generated.no_validator_configured offer_id=%s", offer_id)
            warnings.append(msg)
            return warnings

        if not smtp.host or not smtp.from_email:
            msg = (
                "Le serveur SMTP n'est pas configuré : la notification au validateur n'a pas été envoyée. "
                "Rendez-vous dans PATCH /api/v1/config/app/smtp pour le configurer."
            )
            logger.warning("notification.offer_generated.smtp_not_configured offer_id=%s", offer_id)
            warnings.append(msg)
            return warnings

        to_email = await _get_validator_email(validator_id)
        if not to_email:
            msg = (
                f"Le validateur configuré (id={validator_id}) n'a pas d'adresse email dans Keycloak. "
                "La notification n'a pas pu être envoyée."
            )
            logger.warning("notification.offer_generated.no_email validator_id=%s", validator_id)
            warnings.append(msg)
            return warnings

        validator_first_name = await _get_validator_first_name(validator_id) or "Validateur"
        title = offer_title or f"Offre {offer_id}"
        subject = f"[PortaLis] Offre à valider : {title}"
        html_body = _base_template(
            recipient_name=validator_first_name,
            intro="Une offre de transport a été générée et attend votre validation. "
                  "Connectez-vous à PortaLis pour l'examiner et l'approuver.",
            rows=[
                ("Offre", title),
                ("Créée par", author_name),
                ("Référence", str(offer_id)),
            ],
            cta_label="Valider l'offre",
            cta_url="#",
            info_box="Cette offre ne sera transmise à Odoo qu'après votre validation explicite.",
        )

        await asyncio.to_thread(_send_smtp, smtp, to_email, subject, html_body)
        logger.info("notification.offer_generated.sent to=%s offer_id=%s", to_email, offer_id)

    except Exception as exc:
        msg = f"L'email de notification n'a pas pu être envoyé ({exc})."
        logger.warning("notification.offer_generated.failed offer_id=%s error=%s", offer_id, exc)
        warnings.append(msg)

    return warnings


async def notify_compte_rendu_generated(
    cr_id: UUID,
    prospect_name: str | None,
    author_name: str,
    download_url: str | None,
) -> list[str]:
    """Envoie un email au validateur désigné quand un compte rendu est généré.

    Retourne une liste de warnings (non bloquants) à remonter dans la réponse API.
    """
    warnings: list[str] = []
    try:
        from app.infrastructure.db.repositories.app_config import AppConfigRepository
        config = await AppConfigRepository().get()
        smtp = config.smtp
        validator_id = config.validators.cr_validator_user_id

        if not validator_id:
            msg = (
                "Aucun validateur de comptes rendus n'est configuré. "
                "Rendez-vous dans PATCH /api/v1/config/app/validators pour en désigner un."
            )
            logger.warning("notification.cr_generated.no_validator_configured cr_id=%s", cr_id)
            warnings.append(msg)
            return warnings

        if not smtp.host or not smtp.from_email:
            msg = (
                "Le serveur SMTP n'est pas configuré : la notification au validateur n'a pas été envoyée. "
                "Rendez-vous dans PATCH /api/v1/config/app/smtp pour le configurer."
            )
            logger.warning("notification.cr_generated.smtp_not_configured cr_id=%s", cr_id)
            warnings.append(msg)
            return warnings

        to_email = await _get_validator_email(validator_id)
        if not to_email:
            msg = (
                f"Le validateur configuré (id={validator_id}) n'a pas d'adresse email dans Keycloak. "
                "La notification n'a pas pu être envoyée."
            )
            logger.warning("notification.cr_generated.no_email validator_id=%s", validator_id)
            warnings.append(msg)
            return warnings

        validator_first_name = await _get_validator_first_name(validator_id) or "Validateur"
        label = prospect_name or f"Compte rendu {cr_id}"
        subject = f"[PortaLis] Compte rendu à valider : {label}"
        html_body = _base_template(
            recipient_name=validator_first_name,
            intro="Un compte rendu de visite a été généré et attend votre validation. "
                  "Consultez le document ci-dessous avant de l'approuver.",
            rows=[
                ("Prospect", label),
                ("Créé par", author_name),
                ("Référence", str(cr_id)),
            ],
            cta_label="Télécharger le compte rendu" if download_url else None,
            cta_url=download_url,
            info_box="Le compte rendu sera finalisé uniquement après votre approbation.",
        )

        await asyncio.to_thread(_send_smtp, smtp, to_email, subject, html_body)
        logger.info("notification.cr_generated.sent to=%s cr_id=%s", to_email, cr_id)

    except Exception as exc:
        msg = f"L'email de notification n'a pas pu être envoyé ({exc})."
        logger.warning("notification.cr_generated.failed cr_id=%s error=%s", cr_id, exc)
        warnings.append(msg)

    return warnings
