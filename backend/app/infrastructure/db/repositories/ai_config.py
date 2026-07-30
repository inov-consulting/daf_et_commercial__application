"""Repository IA : modèles + configuration active."""

from collections.abc import Sequence
from typing import Literal
from uuid import UUID, uuid4

from app.domain.shared.ai_config import (
    DEFAULT_EMBEDDING_MODEL_NAME,
    DEFAULT_MODEL_NAME,
    INITIAL_MODELS,
    AiConfig,
    AiModel,
)
from app.infrastructure.db.models.ai_config import AiConfigOrm, AiModelOrm


class AiModelRepository:
    async def seed(self) -> None:
        """Insère les modèles initiaux s'ils n'existent pas encore."""
        for m in INITIAL_MODELS:
            await AiModelOrm.get_or_create(
                name=m["name"],
                defaults={
                    "id": uuid4(),
                    "provider": m["provider"],
                    "is_embedding": m["is_embedding"],
                },
            )

    async def list_all(self) -> Sequence[AiModel]:
        rows = await AiModelOrm.filter(is_active=True).order_by("provider", "name")
        return [r.to_domain() for r in rows]

    async def list_by_provider(self, provider: Literal["anthropic", "openai"]) -> Sequence[AiModel]:
        rows = await AiModelOrm.filter(is_active=True, provider=provider).order_by("name")
        return [r.to_domain() for r in rows]

    async def get_by_id(self, model_id: UUID) -> AiModel | None:
        orm = await AiModelOrm.get_or_none(id=model_id)
        return orm.to_domain() if orm else None

    async def get_by_name(self, name: str) -> AiModel | None:
        orm = await AiModelOrm.get_or_none(name=name)
        return orm.to_domain() if orm else None

    async def add(self, name: str, provider: str, is_embedding: bool) -> AiModel:
        orm = await AiModelOrm.create(
            id=uuid4(),
            name=name,
            provider=provider,
            is_embedding=is_embedding,
        )
        return orm.to_domain()

    async def deactivate(self, model_id: UUID) -> None:
        await AiModelOrm.filter(id=model_id).update(is_active=False)


class AiConfigRepository:
    async def _get_or_create(self) -> AiConfigOrm:
        """Retourne la config singleton, la crée avec les défauts si absente."""
        orm = await AiConfigOrm.first()
        if orm is None:
            model_orm = await AiModelOrm.get_or_none(name=DEFAULT_MODEL_NAME)
            embedding_orm = await AiModelOrm.get_or_none(name=DEFAULT_EMBEDDING_MODEL_NAME)
            if model_orm is None or embedding_orm is None:
                raise RuntimeError(
                    "Modèles par défaut absents du catalogue. "
                    "Lancer le seed avec AiModelRepository.seed()."
                )
            orm = await AiConfigOrm.create(
                id=uuid4(),
                default_model=model_orm,
                default_embedding_model=embedding_orm,
            )
        return orm

    async def get(self) -> tuple[AiConfig, AiModel, AiModel]:
        """Retourne (config, modèle_génération, modèle_embedding)."""
        orm = await self._get_or_create()
        await orm.fetch_related("default_model", "default_embedding_model")
        return (
            orm.to_domain(),
            orm.default_model.to_domain(),            orm.default_embedding_model.to_domain(),        )

    async def set_default_model(self, model_orm: AiModelOrm) -> tuple[AiConfig, AiModel, AiModel]:
        orm = await self._get_or_create()
        orm.default_model = model_orm
        await orm.save()
        await orm.fetch_related("default_model", "default_embedding_model")
        return (
            orm.to_domain(),
            orm.default_model.to_domain(),            orm.default_embedding_model.to_domain(),        )

    async def set_default_embedding_model(self, model_orm: AiModelOrm) -> tuple[AiConfig, AiModel, AiModel]:
        orm = await self._get_or_create()
        orm.default_embedding_model = model_orm
        await orm.save()
        await orm.fetch_related("default_model", "default_embedding_model")
        return (
            orm.to_domain(),
            orm.default_model.to_domain(),            orm.default_embedding_model.to_domain(),        )

    async def set_compte_rendu_template(self, template: str | None) -> tuple[AiConfig, AiModel, AiModel]:
        """Met à jour le template de compte-rendu."""
        orm = await self._get_or_create()
        orm.compte_rendu_template = template
        await orm.save()
        await orm.fetch_related("default_model", "default_embedding_model")
        return (
            orm.to_domain(),
            orm.default_model.to_domain(),            orm.default_embedding_model.to_domain(),        )
