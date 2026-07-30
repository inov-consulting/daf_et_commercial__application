"""Use case : récupérer la configuration IA active."""

from app.domain.shared.ai_config import AiConfig, AiModel
from app.infrastructure.db.repositories.ai_config import AiConfigRepository


class GetAiConfigUseCase:
    def __init__(self, repo: AiConfigRepository) -> None:
        self._repo = repo

    async def execute(self) -> tuple[AiConfig, AiModel, AiModel]:
        return await self._repo.get()
