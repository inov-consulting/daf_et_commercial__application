"""Use cases : changer le modèle de génération ou d'embedding par défaut."""

from uuid import UUID

from app.application.shared.exceptions import ApplicationError, NotFoundError
from app.domain.shared.ai_config import AiConfig, AiModel
from app.infrastructure.db.models.ai_config import AiModelOrm
from app.infrastructure.db.repositories.ai_config import AiConfigRepository, AiModelRepository


class UpdateAiConfigUseCase:
    def __init__(self, config_repo: AiConfigRepository, model_repo: AiModelRepository) -> None:
        self._config_repo = config_repo
        self._model_repo = model_repo

    async def set_generation_model(self, model_id: UUID) -> tuple[AiConfig, AiModel, AiModel]:
        model = await self._model_repo.get_by_id(model_id)
        if model is None or not model.is_active:
            raise NotFoundError(f"Modèle {model_id} introuvable ou inactif")
        if model.is_embedding:
            raise ApplicationError("Un modèle d'embedding ne peut pas être modèle de génération")
        model_orm = await AiModelOrm.get(id=model_id)
        return await self._config_repo.set_default_model(model_orm)

    async def set_embedding_model(self, model_id: UUID) -> tuple[AiConfig, AiModel, AiModel]:
        model = await self._model_repo.get_by_id(model_id)
        if model is None or not model.is_active:
            raise NotFoundError(f"Modèle {model_id} introuvable ou inactif")
        if not model.is_embedding:
            raise ApplicationError("Ce modèle n'est pas un modèle d'embedding")
        model_orm = await AiModelOrm.get(id=model_id)
        return await self._config_repo.set_default_embedding_model(model_orm)
