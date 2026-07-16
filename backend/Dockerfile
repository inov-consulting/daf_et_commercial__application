# syntax=docker/dockerfile:1.7
# ───── Base : uv + Python 3.12 ─────────────────────────────────────────
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Dépendances système : libpq + Playwright/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    # Playwright/Chromium deps
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 fonts-liberation libappindicator3-1 \
    && rm -rf /var/lib/apt/lists/*

# ───── Stage dev : volume monté + reload ────────────────────────────────
FROM base AS dev

# Installer toutes les deps (prod + dev)
COPY pyproject.toml uv.lock* ./


RUN uv sync --frozen --no-install-project 2>/dev/null || uv sync --no-install-project

RUN playwright install chromium

# Le code sera monté en volume (cf docker-compose), donc on ne le COPY pas ici
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ───── Stage prod : code embarqué, pas de deps dev ──────────────────────
FROM base AS prod

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev --no-install-project 2>/dev/null || uv sync --no-dev --no-install-project

# Créer l'utilisateur et installer Playwright avec les bons droits
RUN useradd -m -u 1000 appuser

# Installer Chromium pour Playwright dans un dossier accessible
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN playwright install chromium && \
    chown -R appuser:appuser /opt/playwright-browsers

COPY . .
COPY /home/debian/.services_datas/portalis/backend/portalis-4add6-firebase-adminsdk-fbsvc-dbb26ca65f.json ./app/portalis-4add6-firebase-adminsdk-fbsvc-dbb26ca65f.json

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "3"]
