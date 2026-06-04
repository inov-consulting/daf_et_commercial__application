"""ORM models IA : catalogue de modèles + configuration active."""

from tortoise import fields

from app.domain.shared.ai_config import AiConfig, AiModel
from app.infrastructure.db.base import BaseModel


class AiModelOrm(BaseModel):
    name: str = fields.CharField(max_length=128, unique=True)
    provider: str = fields.CharField(max_length=32)   # "anthropic" | "openai" | "groq"
    is_embedding: bool = fields.BooleanField(default=False)
    is_active: bool = fields.BooleanField(default=True)

    class Meta:
        table = "ai_models"

    def to_domain(self) -> AiModel:
        return AiModel(
            id=self.id,
            name=self.name,
            provider=self.provider,  # type: ignore[arg-type]
            is_embedding=self.is_embedding,
            is_active=self.is_active,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )


class AiConfigOrm(BaseModel):
    default_model: fields.ForeignKeyRelation["AiModelOrm"] = fields.ForeignKeyField(
        "models.AiModelOrm", related_name="configs_generation"
    )
    default_embedding_model: fields.ForeignKeyRelation["AiModelOrm"] = fields.ForeignKeyField(
        "models.AiModelOrm", related_name="configs_embedding"
    )

    class Meta:
        table = "ai_config"

    def to_domain(self) -> AiConfig:
        return AiConfig(
            id=self.id,
            default_model_id=self.default_model_id,  # type: ignore[attr-defined]
            default_embedding_model_id=self.default_embedding_model_id,  # type: ignore[attr-defined]
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
