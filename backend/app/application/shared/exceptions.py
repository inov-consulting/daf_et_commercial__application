"""Exceptions applicatives métier (indépendantes de FastAPI/HTTP)."""


class ApplicationError(Exception):
    """Erreur applicative générique."""


class NotFoundError(ApplicationError):
    """Ressource demandée introuvable."""


class ConflictError(ApplicationError):
    """Conflit métier (ex: email déjà utilisé)."""


class AuthenticationError(ApplicationError):
    """Identifiants invalides."""


class AuthorizationError(ApplicationError):
    """L'utilisateur n'a pas le droit de faire cette action."""
