"""Service de notification WhatsApp — appelable depuis n'importe quel module.

Nécessite que setup_whatsapp(app) ait été appelé au démarrage.

Usage :
    from app.infrastructure.whatsapp.notification import send_whatsapp
    await send_whatsapp("22890123456", "Votre offre a été validée.")

    await send_whatsapp_bulk(["22890123456", "22891234567"], "Analyse DAF terminée.")
"""

from __future__ import annotations

import asyncio
import logging

logger = logging.getLogger(__name__)


async def send_whatsapp(phone: str, message: str) -> bool:
    """Envoie un message WhatsApp à un numéro via pywa.

    Args:
        phone: Numéro international sans '+' (ex: '22890123456')
        message: Texte du message (max 4096 caractères)

    Returns:
        True si envoyé avec succès, False sinon.
    """
    from app.infrastructure.whatsapp.client import get_wa, is_configured

    if not is_configured():
        logger.warning("whatsapp.notification.not_configured — message non envoyé à %s", phone[:6] + "***")
        return False

    try:
        wa = get_wa()
        await wa.send_message(to=phone, text=message)
        logger.info("whatsapp.notification.sent to=%s", phone[:3] + "***" + phone[-3:])
        return True
    except Exception:
        logger.exception("whatsapp.notification.failed to=%s", phone[:3] + "***")
        return False


async def send_whatsapp_bulk(phones: list[str], message: str) -> dict[str, bool]:
    """Envoie un message WhatsApp à plusieurs numéros en parallèle.

    Args:
        phones: Liste de numéros internationaux sans '+'
        message: Texte commun à envoyer

    Returns:
        Dict {phone: True/False} avec le résultat par numéro.
    """
    results = await asyncio.gather(
        *[send_whatsapp(phone, message) for phone in phones],
        return_exceptions=True,
    )
    return {
        phone: (result is True)
        for phone, result in zip(phones, results)
    }


async def send_whatsapp_template(
    phone: str,
    template_name: str,
    language_code: str = "fr",
    components: list[dict] | None = None,
) -> bool:
    """Envoie un message basé sur un template Meta approuvé via pywa.

    Obligatoire pour initier une conversation hors fenêtre 24h.

    Args:
        phone: Numéro international sans '+'
        template_name: Nom exact du template dans Meta Business Manager
        language_code: Code langue (ex: 'fr', 'en_US')
        components: Variables du template (body params, header, boutons)
    """
    from app.infrastructure.whatsapp.client import get_wa, is_configured
    from pywa_async.types import Template, Language

    if not is_configured():
        logger.warning("whatsapp.template.not_configured")
        return False

    try:
        wa = get_wa()
        template = Template(
            name=template_name,
            language=Language(code=language_code),
            components=components or [],
        )
        await wa.send_template(to=phone, template=template)
        return True
    except Exception:
        logger.exception("whatsapp.template.failed to=%s template=%s", phone[:6] + "***", template_name)
        return False
