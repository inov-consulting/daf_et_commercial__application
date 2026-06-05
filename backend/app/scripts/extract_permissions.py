"""Script utilitaire : extrait toutes les permissions des routers FastAPI.

Usage :
    cd backend && python -m app.scripts.extract_permissions
    cd backend && python -m app.scripts.extract_permissions --json

Génère un mapping {resource: [actions]} à partir des appels
``require_permission("resource:action")`` présents dans les routers.
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent / "api" / "v1"


def _find_require_permission_calls(source: str) -> set[str]:
    """Parse un fichier Python et retourne l'ensemble des strings passées à
    ``require_permission(...)``.
    """
    perms: set[str] = set()
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return perms

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = node.func
            if (isinstance(func, ast.Name) and func.id == "require_permission"
                    and node.args and isinstance(node.args[0], ast.Constant)):
                    perms.add(node.args[0].value)
    return perms


def extract() -> dict[str, list[str]]:
    """Scanne ``app/api/v1/*.py`` et agrège les permissions par ressource."""
    raw_perms: set[str] = set()

    for py_file in API_DIR.glob("*.py"):
        if py_file.name.startswith("_"):
            continue
        raw_perms |= _find_require_permission_calls(py_file.read_text("utf-8"))

    grouped: dict[str, set[str]] = {}
    for perm in sorted(raw_perms):
        if ":" not in perm:
            continue
        resource, action = perm.split(":", 1)
        grouped.setdefault(resource, set()).add(action)

    return {k: sorted(v) for k, v in sorted(grouped.items())}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Extraire les permissions des routers")
    parser.add_argument("--json", action="store_true", help="Sortie JSON")
    args = parser.parse_args(argv)

    result = extract()

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("Permissions détectées dans les routers :\n")
        for resource, actions in result.items():
            print(f"  {resource:20s} → {', '.join(actions)}")
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
