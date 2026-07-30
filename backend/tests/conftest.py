import logging
import os

import structlog

# Fixe les variables minimales pour que `Settings` charge en tests
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-prod-please")
os.environ.setdefault("APP_DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/1")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Reconfigure structlog pour les tests : utilise stdlib pour éviter
# l'erreur "PrintLogger has no attribute 'name'"
logging.basicConfig(level=logging.WARNING)
structlog.configure(
    processors=[structlog.dev.ConsoleRenderer()],
    wrapper_class=structlog.make_filtering_bound_logger(logging.WARNING),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=False,
)
