"""Modèles ORM — Conversations et messages WhatsApp.

Deux tables :
  whatsapp_conversations  — une ligne par contact (numéro client)
  whatsapp_messages       — tous les messages (entrants et sortants) + métadonnées Meta complètes

Tout ce que Meta retourne dans le webhook est conservé :
  - metadata  (phone_number_id, display_phone_number du business)
  - contacts  (wa_id, nom du profil)
  - messages  (wamid, type, body, timestamp, médias)
  - statuses  (delivered, read, failed pour les messages sortants)
  - raw_payload : JSON complet pour audit et débogage
"""

from tortoise import fields
from tortoise.models import Model


class WhatsAppConversationOrm(Model):
    """Une conversation = un contact (numéro WhatsApp) avec le business.

    Chaque contact a une seule conversation active à la fois.
    """

    class Meta:
        table = "whatsapp_conversations"

    id = fields.UUIDField(pk=True)

    # ── Contact (côté client) ──────────────────────────────────────────
    wa_id = fields.CharField(max_length=50)          # numéro client ex: "22890123456"
    contact_name = fields.CharField(max_length=200, null=True)  # nom profil WhatsApp

    # ── Numéro business qui reçoit la conversation ─────────────────────
    phone_number_id = fields.CharField(max_length=50)           # ID Meta du numéro business
    display_phone_number = fields.CharField(max_length=30, null=True)  # "+1 555 145-5874"

    # ── Statut de la conversation ──────────────────────────────────────
    status = fields.CharField(max_length=20, default="active")
    # active   — conversation en cours (fenêtre 24h ouverte)
    # archived — plus de 24h sans message, hors fenêtre WhatsApp

    unread_count = fields.IntField(default=0)
    # Nombre de messages entrants non lus. Incrémenté à chaque message reçu,
    # remis à 0 par POST /conversations/{id}/read.

    last_message_at = fields.DatetimeField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    def __str__(self) -> str:
        return f"WA:{self.wa_id} ({self.contact_name or 'inconnu'})"


class WhatsAppMessageOrm(Model):
    """Un message WhatsApp — entrant (client→business) ou sortant (business→client).

    Tous les champs retournés par Meta sont persistés.
    Le raw_payload conserve le JSON brut pour audit complet.
    """

    class Meta:
        table = "whatsapp_messages"

    id = fields.UUIDField(pk=True)
    conversation = fields.ForeignKeyField(
        "models.WhatsAppConversationOrm",
        related_name="messages",
        on_delete=fields.CASCADE,
    )

    # ── Identifiant Meta ───────────────────────────────────────────────
    wamid = fields.CharField(max_length=500, unique=True)
    # ex: "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA="

    # ── Direction ──────────────────────────────────────────────────────
    direction = fields.CharField(max_length=10)
    # "inbound"  — message reçu du client
    # "outbound" — message envoyé par le business (notre réponse IA)

    # ── Type et contenu ────────────────────────────────────────────────
    message_type = fields.CharField(max_length=20)
    # text | image | document | audio | video | sticker | location | template

    body = fields.TextField(null=True)       # contenu texte (type=text)
    media_id = fields.CharField(max_length=300, null=True)   # ID média Meta (image, doc, etc.)
    media_mime_type = fields.CharField(max_length=100, null=True)
    media_filename = fields.CharField(max_length=300, null=True)
    media_url = fields.CharField(max_length=1000, null=True) # URL MinIO après téléchargement

    # ── Timestamp Meta (Unix en secondes → converti en datetime) ───────
    meta_timestamp = fields.DatetimeField(null=True)

    # ── Statut de livraison (messages sortants uniquement) ─────────────
    delivery_status = fields.CharField(max_length=20, null=True)
    # sent | delivered | read | failed

    error_code = fields.IntField(null=True)
    error_message = fields.CharField(max_length=500, null=True)

    # ── Payload brut complet ───────────────────────────────────────────
    raw_payload = fields.JSONField(null=True)
    # Conserve l'intégralité du JSON Meta pour audit, débogage, et rejeu

    created_at = fields.DatetimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.direction}:{self.message_type}:{self.wamid[:20]}..."
