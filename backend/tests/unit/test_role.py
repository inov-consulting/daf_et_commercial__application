from app.domain.shared.role import Role, has_permission, permissions_of


def test_commercial_can_create_prospect() -> None:
    assert has_permission(Role.COMMERCIAL, "prospect:create")


def test_commercial_cannot_create_user() -> None:
    assert not has_permission(Role.COMMERCIAL, "user:create")


def test_admin_inov_can_create_user_and_company() -> None:
    assert has_permission(Role.ADMIN_INOV, "user:create")
    assert has_permission(Role.ADMIN_INOV, "company:create")


def test_finance_can_read_treasury() -> None:
    assert has_permission(Role.FINANCE, "treasury:read_all")


def test_cabinet_comptable_is_read_only() -> None:
    perms = permissions_of(Role.CABINET_COMPTABLE)
    assert all(":read" in p for p in perms)


def test_direction_sees_everything_in_read() -> None:
    assert has_permission(Role.DIRECTION, "kpi:read_all")
    assert has_permission(Role.DIRECTION, "transport_file:read_all")
