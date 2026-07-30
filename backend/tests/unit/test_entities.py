from uuid import uuid4

import pytest
from app.domain.shared.company import Company
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


def test_user_new_creates_with_keycloak_id() -> None:
    kid = uuid4()
    cid = uuid4()
    u = User.new(keycloak_id=kid, company_ids=[cid])
    assert u.id == kid
    assert u.company_ids == [cid]
    assert u.is_active is True


def test_user_display_name_fallbacks_to_email() -> None:
    u = User.new(keycloak_id=uuid4(), company_ids=[])
    u.email = "a@b.com"
    assert u.display_name == "a@b.com"

    u.first_name = "Edwin"
    u.last_name = "Tchakounte"
    assert u.display_name == "Edwin Tchakounte"


def test_user_new_empty_company_ids() -> None:
    u = User.new(keycloak_id=uuid4(), company_ids=[])
    assert u.company_ids == []
