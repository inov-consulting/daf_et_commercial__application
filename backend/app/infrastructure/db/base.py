"""Base Tortoise ORM : modèle abstrait avec colonnes communes."""

from datetime import datetime
from uuid import UUID

from tortoise import fields
from tortoise.models import Model


class BaseModel(Model):
    """Classe de base de tous les modèles ORM."""

    id: UUID = fields.UUIDField(pk=True)
    created_at: datetime = fields.DatetimeField(auto_now_add=True)
    updated_at: datetime = fields.DatetimeField(auto_now=True)

    class Meta:
        abstract = True
