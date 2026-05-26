from uuid import uuid4

import pytest
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    h = hash_password("CorrectHorseBatteryStaple")
    assert verify_password("CorrectHorseBatteryStaple", h)
    assert not verify_password("wrong", h)


def test_password_hash_is_salted() -> None:
    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2


def test_jwt_access_token_roundtrip() -> None:
    user_id = uuid4()
    token = create_access_token(user_id=user_id, extra_claims={"role": "commercial"})
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "commercial"
    assert payload["type"] == "access"


def test_refresh_token_cannot_be_used_as_access() -> None:
    user_id = uuid4()
    refresh = create_refresh_token(user_id=user_id)
    with pytest.raises(TokenError):
        decode_token(refresh, expected_type="access")


def test_tampered_token_rejected() -> None:
    user_id = uuid4()
    token = create_access_token(user_id=user_id)
    tampered = token[:-2] + ("aa" if token[-2:] != "aa" else "bb")
    with pytest.raises(TokenError):
        decode_token(tampered, expected_type="access")
