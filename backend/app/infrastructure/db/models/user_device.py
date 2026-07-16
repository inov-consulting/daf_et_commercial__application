"""ORM model pour les appareils utilisateurs (FCM tokens).

Un utilisateur peut avoir plusieurs appareils (mobile iOS/Android, web, desktop).
Chaque appareil enregistre son FCM token au démarrage de l'app.
"""
from __future__ import annotations

from tortoise import fields

from app.infrastructure.db.base import BaseModel


class UserDeviceOrm(BaseModel):
    user_id = fields.UUIDField(index=True)
    fcm_token = fields.CharField(max_length=512, unique=True)
    platform = fields.CharField(max_length=50, null=True, default=None)   # "android" | "ios" | "web"
    device_name = fields.CharField(max_length=255, null=True, default=None)  # "Samsung Galaxy S24"
    last_seen_at = fields.DatetimeField(null=True, default=None)

    class Meta:
        table = "user_devices"
