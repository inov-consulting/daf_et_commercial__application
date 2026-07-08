"""Modèles Tortoise ORM pour les Notes et Compte-Rendus."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from tortoise import fields

from app.infrastructure.db.base import BaseModel

if TYPE_CHECKING:
    from app.infrastructure.db.models.prospect import ProspectOrm
    from app.infrastructure.db.models.user import UserOrm


class NoteOrm(BaseModel):
    """Notes textuelles liées à un prospect.

    Chaque utilisateur peut ajouter plusieurs notes sur un prospect.
    Le contenu est en Markdown pour permettre le formatage.
    """

    prospect: fields.ForeignKeyRelation["ProspectOrm"] = fields.ForeignKeyField(
        "models.ProspectOrm",
        related_name="notes",
        on_delete=fields.CASCADE,
    )
    author: fields.ForeignKeyRelation["UserOrm"] = fields.ForeignKeyField(
        "models.UserOrm",
        related_name="notes",
        on_delete=fields.SET_NULL,
        null=True,
    )
    content: str = fields.TextField()  # Markdown

    class Meta:
        table = "notes"
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        return f"<Note {self.id} prospect={self.prospect_id}>"


class CompteRenduOrm(BaseModel):
    """Compte-rendu généré (PDF) lié à un prospect ou un service.

    Stocke les métadonnées du CR. Le fichier PDF est sur MinIO.
    """

    parent_type: str = fields.CharField(max_length=20)  # prospect | service
    parent_id: UUID = fields.UUIDField(index=True)

    version: int = fields.IntField(default=1)
    status: str = fields.CharField(max_length=20, default="final")  # draft | final

    # Stockage MinIO
    minio_bucket: str = fields.CharField(max_length=100, default="documents")
    minio_path: str = fields.CharField(max_length=500)  # cr/prospect/123/v1.pdf
    file_size: int | None = fields.IntField(null=True)

    # Traçabilité génération
    generated_by: str = fields.CharField(max_length=20)  # ai | user
    prompt_used: str | None = fields.TextField(null=True)  # Prompt envoyé à Claude
    content: str | None = fields.TextField(null=True)  # HTML généré par Claude (modifiable)
    note_ids: list | None = fields.JSONField(null=True)  # IDs des notes utilisées (liste)

    # Statut de génération asynchrone
    generation_status: str = fields.CharField(
        max_length=20, default="done"
    )  # pending | running | done | failed
    generation_error: str | None = fields.TextField(null=True)

    # Auteur
    created_by: fields.ForeignKeyRelation["UserOrm"] = fields.ForeignKeyField(
        "models.UserOrm",
        related_name="compte_rendus",
        on_delete=fields.SET_NULL,
        null=True,
    )

    class Meta:
        table = "compte_rendus"
        ordering = ["-created_at"]
        unique_together = [("parent_type", "parent_id", "version")]

    def __repr__(self) -> str:
        return f"<CR {self.id} {self.parent_type}={self.parent_id} v{self.version}>"
