"""Use case : ajouter un modèle au catalogue."""

from app.application.shared.exceptions import ConflictError
from app.domain.shared.ai_config import AiModel
from app.infrastructure.db.repositories.ai_config import AiModelRepository


class AddAiModelUseCase:
    def __init__(self, repo: AiModelRepository) -> None:
        self._repo = repo

    async def execute(self, name: str, provider: str, is_embedding: bool) -> AiModel:
        existing = await self._repo.get_by_name(name)
        if existing is not None:
            raise ConflictError(f"Modèle '{name}' existe déjà")
        return await self._repo.add(name=name, provider=provider, is_embedding=is_embedding)
