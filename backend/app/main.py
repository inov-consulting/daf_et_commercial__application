from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.v1 import ai_config, auth, chat, companies, groups, health, prospects, users
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.infrastructure.db.repositories.ai_config import AiModelRepository
from app.infrastructure.db.session import close_db, init_db

configure_logging(settings.backend_log_level)
logger = get_logger(__name__)

API_V1_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("backend.startup", environment=settings.environment)
    await init_db()
    await AiModelRepository().seed()
    try:
        yield
    finally:
        await close_db()
        logger.info("backend.shutdown")


app = FastAPI(
    title="PortaLis",
    description="API Plateforme IA Commerciale & DAF — PortaLis / Inov Coonsulting",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

# System endpoints (pas de préfixe versionné)
app.include_router(health.router, tags=["system"])

# API v1
app.include_router(auth.router, prefix=API_V1_PREFIX)
app.include_router(companies.router, prefix=API_V1_PREFIX)
app.include_router(users.router, prefix=API_V1_PREFIX)
app.include_router(groups.router, prefix=API_V1_PREFIX)
app.include_router(ai_config.router, prefix=API_V1_PREFIX)
app.include_router(chat.router, prefix=API_V1_PREFIX)
app.include_router(prospects.router, prefix=API_V1_PREFIX)
