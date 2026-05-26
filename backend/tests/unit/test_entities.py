from uuid import uuid4

import pytest

from app.domain.shared.company import Company
from app.domain.shared.role import Role
from app.domain.shared.user import User
from app.domain.shared.value_objects import Country, Currency


def test_company_new_trims_name_and_generates_id() -> None:
    c = Company.new(
        name="  Hawa Paraiso Sénégal  ",
        country=Country.SN,
        default_currency=Currency.XOF,
    )
    assert c.name == "Hawa Paraiso Sénégal"
    assert c.country == Country.SN
    assert c.default_currency == Currency.XOF
    assert c.is_active is True
    assert c.id is not None


def test_company_rejects_empty_name() -> None:
    with pytest.raises(ValueError):
        Company.new(name="   ", country=Country.SN, default_currency=Currency.XOF)


def test_user_new_normalizes_email_lowercase() -> None:
    u = User.new(
        company_id=uuid4(),
        email="  HAWA@Paraiso.SN  ",
        password_hash="x",
        role=Role.DIRECTION,
    )
    assert u.email == "hawa@paraiso.sn"


def test_user_display_name_fallbacks_to_email() -> None:
    u = User.new(
        company_id=uuid4(),
        email="a@b.com",
        password_hash="x",
        role=Role.COMMERCIAL,
    )
    assert u.display_name == "a@b.com"

    u.first_name = "Edwin"
    u.last_name = "Tchakounte"
    assert u.display_name == "Edwin Tchakounte"


def test_user_invalid_email_raises() -> None:
    with pytest.raises(ValueError):
        User.new(
            company_id=uuid4(),
            email="not-an-email",
            password_hash="x",
            role=Role.COMMERCIAL,
        )
