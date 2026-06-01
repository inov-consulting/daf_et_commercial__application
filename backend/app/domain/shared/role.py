"""Rôles utilisateurs et matrice de permissions.

Issus du cahier des charges (section 14, ticket S1-07).
Les rôles sont une notion transverse — toute fonctionnalité métier vérifie
les permissions via ce module.
"""

from enum import StrEnum


class Role(StrEnum):
    COMMERCIAL = "commercial"
    """Saisit prospects, CR, offres ; voit son pipeline."""

    MANAGER_PAYS = "manager_pays"
    """Pilote son pays : pipeline pays, valide offres."""

    DIRECTION = "direction"
    """Hawa : vue globale multi-pays."""

    FINANCE = "finance"
    """Trésorerie, dossiers, factures, reporting."""

    ADMIN_INOV = "admin_inov"
    """Maintenance technique INOV."""

    CABINET_COMPTABLE = "cabinet_comptable"
    """Accès comptable limité (lecture)."""


# Permissions agrégées par rôle. Évite de disperser des `if role == ...` dans le code.
# À étendre quand de nouvelles actions sensibles apparaissent.
_PERMISSIONS: dict[Role, frozenset[str]] = {
    Role.COMMERCIAL: frozenset({
        "prospect:create", "prospect:read_own", "prospect:update_own",
        "meeting_report:create", "meeting_report:read_own",
        "offer:create_draft", "offer:read_own",
        "opportunity:read_own",
    }),
    Role.MANAGER_PAYS: frozenset({
        "prospect:read_country", "prospect:update_country",
        "meeting_report:read_country",
        "offer:validate", "offer:read_country",
        "opportunity:read_country", "opportunity:update_country",
        "user:read_country",
    }),
    Role.DIRECTION: frozenset({
        "prospect:read_all",
        "meeting_report:read_all",
        "offer:read_all",
        "opportunity:read_all",
        "transport_file:read_all",
        "kpi:read_all",
        "report:read_all",
    }),
    Role.FINANCE: frozenset({
        "transport_file:read_all", "transport_file:update_all",
        "cost_line:create", "cost_line:read_all", "cost_line:update_all",
        "revenue_line:create", "revenue_line:read_all", "revenue_line:update_all",
        "invoice:read_all",
        "treasury:read_all",
        "report:read_all",
    }),
    Role.ADMIN_INOV: frozenset({
        "user:create", "user:read", "user:update", "user:delete",
        "company:create", "company:read", "company:update", "company:delete",
        "role:assign",
        "system:read_logs", "system:configure",
    }),
    Role.CABINET_COMPTABLE: frozenset({
        "invoice:read_all",
        "transport_file:read_all",
        "report:read_all",
    }),
}


def has_permission(role: Role, permission: str) -> bool:
    """Vérifie si un rôle dispose d'une permission donnée."""
    return permission in _PERMISSIONS.get(role, frozenset())


def permissions_of(role: Role) -> frozenset[str]:
    return _PERMISSIONS.get(role, frozenset())
