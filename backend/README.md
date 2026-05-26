# Backend — Projet4

API FastAPI organisée en architecture hexagonale.

## Structure

```
backend/
├── app/
│   ├── api/v1/           # Routers FastAPI (HTTP, pas de métier)
│   ├── application/      # Use cases (un fichier = une action métier)
│   │   ├── commercial/
│   │   ├── transport/
│   │   ├── finance/
│   │   └── shared/
│   ├── domain/           # Entités, value objects, ports (interfaces)
│   │   ├── commercial/
│   │   ├── transport/
│   │   ├── finance/
│   │   └── shared/ports/
│   ├── infrastructure/   # Adapters concrets (DB, Odoo, IA, MinIO…)
│   │   ├── db/
│   │   ├── odoo/
│   │   ├── ai/
│   │   ├── storage/
│   │   ├── email/
│   │   └── tasks/
│   ├── core/             # Config, logging, security (transverse)
│   └── main.py
├── migrations/           # Migrations DB Aerich
├── prompts/              # Prompts IA versionnés (YAML)
├── tests/
│   ├── unit/             # Pures (domain + application avec mocks)
│   ├── integration/      # DB + Odoo mock
│   └── e2e/              # API end-to-end
├── pyproject.toml
├── Dockerfile            # multi-stage : dev + prod
└── .python-version
```

## Règle des dépendances

```
api ──► application ──► domain
                          ▲
infrastructure ───────────┘  (implémente les ports)
```

- `domain` ne dépend de rien d'externe (pas de FastAPI, pas de Tortoise ORM, pas d'httpx).
- `application` ne dépend que de `domain` (et de ses ports).
- `infrastructure` implémente les ports de `domain`.
- `api` adapte `application` au protocole HTTP.

## Dev local

Le service tourne dans Docker, le code est monté en volume (reload auto). Voir le `Makefile` racine.

Pour exécuter en local hors Docker :

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

## Tests

```bash
make test                 # depuis la racine, dans le container
cd backend && uv run pytest tests/unit -v   # ou en local
```

## Lint & types

```bash
cd backend
uv run ruff check .
uv run ruff format .
uv run mypy app
```
