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

## Agent IA & Chat

### Architecture

```
POST /api/v1/chat
POST /api/v1/chat/stream   (SSE)
GET  /api/v1/chat/tools
```

L'agent utilise **LangGraph** (`create_react_agent`) avec gestion de sessions multi-tours.

```
Client
  │
  ▼
POST /chat  { session_id?, message }
  │
  ▼
Agent LangGraph
  ├── Tools Python locaux
  │     ├── builtin_tools.py   → search_companies, get_company_details, get_current_date
  │     └── custom_tools.py    → tes propres tools (ajouter ici)
  └── Tools MCP externes (stdio)
        └── Odoo  (uvx mcp-server-odoo)
  │
  ▼
{ session_id, response, tool_used, turn }
```

### Ajouter un custom tool

1. Ouvrir `app/infrastructure/ai/custom_tools.py`
2. Écrire une fonction `async` avec une docstring claire
3. L'enregistrer dans `CUSTOM_REGISTRY`

```python
async def get_invoice_status(invoice_id: str) -> str:
    """Retourne le statut d'une facture par son ID."""
    ...

CUSTOM_REGISTRY = {
    "get_invoice_status": get_invoice_status,
}
```

C'est tout — le tool est disponible immédiatement dans l'agent.

### Ajouter un serveur MCP externe

Ouvrir `app/infrastructure/ai/mcp_servers.py` et ajouter un bloc dans `MCP_SERVERS` :

```python
MCP_SERVERS["mon_service"] = {
    "command": "uvx",
    "args": ["mcp-server-mon-service", "--transport", "stdio"],
    "env": {"API_KEY": "..."},
    "transport": "stdio",
}
```

### Gestion des sessions

- Chaque session est identifiée par un `session_id` (UUID)
- Omis dans la requête → nouvelle session générée par le serveur
- L'historique est conservé en **mémoire RAM** (perdu au redémarrage)
- Compression automatique : les 15 derniers messages sont conservés (`MAX_CONTEXT_MESSAGES`)

### Modèles IA

Configurés en DB via `GET/PATCH /api/v1/ai/config`.
Provider par défaut : **Groq** (`llama-3.3-70b-versatile`).
Supporte : Anthropic Claude, OpenAI GPT, Groq.

Variables `.env` requises selon le provider :

| Provider  | Variable         |
|-----------|-----------------|
| Groq      | `GROQ_API_KEY`  |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI    | `OPENAI_API_KEY` |

### Permissions

Tous les endpoints `/chat` requièrent la permission `chat:create`.

Pour synchroniser les permissions vers Keycloak :

```bash
cd backend
uv run python -m app.scripts.extract_permissions    # voir les permissions détectées
uv run python -m app.scripts.sync_keycloak_roles    # créer les rôles dans Keycloak
```

## Lint & types

```bash
cd backend
uv run ruff check .
uv run ruff format .
uv run mypy app
```
