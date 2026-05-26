import os

# Fixe les variables minimales pour que `Settings` charge en tests
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-prod-please")
os.environ.setdefault("APP_DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/1")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
