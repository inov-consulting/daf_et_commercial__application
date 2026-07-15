from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import bugsnag
from bugsnag.asgi import BugsnagMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.v1 import ai_config, api_logs, auth, chat, companies, compte_rendus, daf, groups, health, kpi, prospects, transport, users
from app.api.v1 import app_config, transport_offers, whatsapp
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.infrastructure.db.repositories.ai_config import AiModelRepository
from app.infrastructure.db.session import close_db, init_db


bugsnag.configure(
    api_key=settings.bugsnag_api_key,
    project_root=str(Path(__file__).parent.parent),
    release_stage=settings.environment,
    notify_release_stages=["staging", "production"],
)

configure_logging(settings.backend_log_level)
logger = get_logger(__name__)

API_V1_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("backend.startup", environment=settings.environment)
    await init_db()
    await AiModelRepository().seed()

    from app.infrastructure.scheduler.daf_scheduler import daf_scheduler
    await daf_scheduler.start()

    try:
        yield
    finally:
        await daf_scheduler.stop()
        await close_db()
        logger.info("backend.shutdown")


app = FastAPI(
    title="PortaLis",
    description="API Plateforme IA Commerciale & DAF — PortaLis / Inov Coonsulting",
    version="0.1.0",
    lifespan=lifespan,
)

# pywa enregistre ses routes GET/POST sur l'app immédiatement (avant démarrage uvicorn)
# Le webhook Meta sera accessible sur /api/v1/webhooks/whatsapp
from app.infrastructure.whatsapp.client import setup_whatsapp
setup_whatsapp(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging des requêtes API (audit/tracing)
from app.infrastructure.web.middleware.api_logging import ApiLoggingMiddleware
app.add_middleware(ApiLoggingMiddleware)

app.add_middleware(BugsnagMiddleware)

register_error_handlers(app)

# System endpoints (pas de préfixe versionné)
app.include_router(health.router, tags=["system"])

# API v1
app.include_router(auth.router, prefix=API_V1_PREFIX)
app.include_router(companies.router, prefix=API_V1_PREFIX)
app.include_router(users.router, prefix=API_V1_PREFIX)
app.include_router(groups.router, prefix=API_V1_PREFIX)
app.include_router(ai_config.router, prefix=API_V1_PREFIX)
app.include_router(api_logs.router, prefix=API_V1_PREFIX)
app.include_router(compte_rendus.router, prefix=API_V1_PREFIX)
app.include_router(chat.router, prefix=API_V1_PREFIX)
app.include_router(prospects.router, prefix=API_V1_PREFIX)
app.include_router(transport.router, prefix=API_V1_PREFIX)
app.include_router(transport_offers.router, prefix=API_V1_PREFIX)
app.include_router(app_config.router, prefix=API_V1_PREFIX)
app.include_router(kpi.router, prefix=API_V1_PREFIX)
app.include_router(daf.router, prefix=API_V1_PREFIX)
app.include_router(whatsapp.router, prefix=API_V1_PREFIX)
