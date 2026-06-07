"""Router /ai : catalogue de modèles + configuration active."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.api.deps import require_permission
from app.application.ai.add_ai_model import AddAiModelUseCase
from app.application.ai.get_ai_config import GetAiConfigUseCase
from app.application.ai.update_ai_config import UpdateAiConfigUseCase
from app.infrastructure.db.repositories.ai_config import AiConfigRepository, AiModelRepository

router = APIRouter(prefix="/ai", tags=["ai"])


# ── Schémas ──────────────────────────────────────────────────────────────

class AiModelOut(BaseModel):
    id: UUID
    name: str
    provider: str
    is_embedding: bool
    is_active: bool
    updated_at: datetime | None


class AiModelsByProviderOut(BaseModel):
    anthropic: list[AiModelOut]
    openai: list[AiModelOut]


class AiConfigOut(BaseModel):
    id: UUID
    default_model: AiModelOut            # modèle de génération
    default_embedding_model: AiModelOut  # modèle d'embedding
    updated_at: datetime | None


class AiModelCreate(BaseModel):
    name: str
    provider: str
    is_embedding: bool = False


class AiConfigUpdateGeneration(BaseModel):
    model_id: UUID


class AiConfigUpdateEmbedding(BaseModel):
    model_id: UUID


# ── Helpers ──────────────────────────────────────────────────────────────

def get_model_repo() -> AiModelRepository:
    return AiModelRepository()


def get_config_repo() -> AiConfigRepository:
    return AiConfigRepository()


def _model_out(m: object) -> AiModelOut:
    from app.domain.shared.ai_config import AiModel
    assert isinstance(m, AiModel)
    return AiModelOut(
        id=m.id, name=m.name, provider=m.provider,
        is_embedding=m.is_embedding, is_active=m.is_active,
        updated_at=m.updated_at,
    )


# ── Endpoints : modèles ──────────────────────────────────────────────────

@router.get("/models", response_model=AiModelsByProviderOut)
async def list_models() -> AiModelsByProviderOut:
    """Liste tous les modèles actifs, groupés par provider."""
    all_models = await get_model_repo().list_all()
    return AiModelsByProviderOut(
        anthropic=[_model_out(m) for m in all_models if m.provider == "anthropic"],
        openai=[_model_out(m) for m in all_models if m.provider == "openai"],
    )


@router.post(
    "/models",
    response_model=AiModelOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("admin"))],
)
async def add_model(payload: AiModelCreate) -> AiModelOut:
    """Ajoute un nouveau modèle au catalogue."""
    model = await AddAiModelUseCase(get_model_repo()).execute(
        name=payload.name,
        provider=payload.provider,
        is_embedding=payload.is_embedding,
    )
    return _model_out(model)


# ── Endpoints : config active ─────────────────────────────────────────────

@router.get("/config", response_model=AiConfigOut)
async def get_ai_config() -> AiConfigOut:
    """Retourne la configuration active (modèle de génération + modèle d'embedding)."""
    config, model, embedding_model = await GetAiConfigUseCase(get_config_repo()).execute()
    return AiConfigOut(
        id=config.id,
        default_model=_model_out(model),
        default_embedding_model=_model_out(embedding_model),
        updated_at=config.updated_at,
    )


@router.patch(
    "/config/generation",
    response_model=AiConfigOut,
    dependencies=[Depends(require_permission("admin"))],
)
async def update_generation_model(payload: AiConfigUpdateGeneration) -> AiConfigOut:
    """Change le modèle de génération par défaut."""
    uc = UpdateAiConfigUseCase(get_config_repo(), get_model_repo())
    config, model, embedding_model = await uc.set_generation_model(payload.model_id)
    return AiConfigOut(
        id=config.id,
        default_model=_model_out(model),
        default_embedding_model=_model_out(embedding_model),
        updated_at=config.updated_at,
    )


@router.patch(
    "/config/embedding",
    response_model=AiConfigOut,
    dependencies=[Depends(require_permission("admin"))],
)
async def update_embedding_model(payload: AiConfigUpdateEmbedding) -> AiConfigOut:
    """Change le modèle d'embedding par défaut."""
    uc = UpdateAiConfigUseCase(get_config_repo(), get_model_repo())
    config, model, embedding_model = await uc.set_embedding_model(payload.model_id)
    return AiConfigOut(
        id=config.id,
        default_model=_model_out(model),
        default_embedding_model=_model_out(embedding_model),
        updated_at=config.updated_at,
    )
