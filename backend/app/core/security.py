"""Sécurité : hash de mot de passe (argon2) + JWT access/refresh."""

from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

_hasher = PasswordHasher()

JWT_ALGORITHM = "HS256"
TokenType = Literal["access", "refresh"]


# ── Mots de passe ───────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    if not plain:
        raise ValueError("Mot de passe vide")
    return _hasher.hash(plain)


def verify_password(plain: str, password_hash: str) -> bool:
    try:
        _hasher.verify(password_hash, plain)
        return True
    except VerifyMismatchError:
        return False


def needs_rehash(password_hash: str) -> bool:
    """True si les paramètres argon2 ont changé et le hash doit être régénéré."""
    return _hasher.check_needs_rehash(password_hash)


# ── JWT ─────────────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(UTC)


def _create_token(
    *,
    subject: UUID,
    token_type: TokenType,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = _now()
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "type": token_type,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def create_access_token(*, user_id: UUID, extra_claims: dict[str, Any] | None = None) -> str:
    return _create_token(
        subject=user_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.jwt_access_minutes),
        extra_claims=extra_claims,
    )


def create_refresh_token(*, user_id: UUID) -> str:
    return _create_token(
        subject=user_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.jwt_refresh_days),
    )


class TokenError(Exception):
    pass


def decode_token(token: str, *, expected_type: TokenType) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise TokenError("Token expiré") from e
    except jwt.InvalidTokenError as e:
        raise TokenError("Token invalide") from e

    if payload.get("type") != expected_type:
        raise TokenError(f"Type de token incorrect (attendu : {expected_type})")
    return payload
