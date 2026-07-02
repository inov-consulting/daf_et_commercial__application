"""Repository : accès KPI par groupe Keycloak."""
from __future__ import annotations

from app.infrastructure.db.models.kpi_group_access import KpiGroupAccessOrm


class KpiGroupAccessRepository:

    async def get_all(self) -> list[KpiGroupAccessOrm]:
        return await KpiGroupAccessOrm.all()

    async def get_by_group_id(self, group_id: str) -> KpiGroupAccessOrm | None:
        return await KpiGroupAccessOrm.get_or_none(group_id=group_id)

    async def set_group_access(
        self,
        group_id: str,
        group_name: str,
        kpi_keys: list[str],
    ) -> KpiGroupAccessOrm:
        """Crée ou met à jour l'accès KPI d'un groupe."""
        orm = await KpiGroupAccessOrm.get_or_none(group_id=group_id)
        if orm is None:
            orm = await KpiGroupAccessOrm.create(
                group_id=group_id,
                group_name=group_name,
                kpi_keys=kpi_keys,
            )
        else:
            orm.group_name = group_name
            orm.kpi_keys = kpi_keys
            await orm.save()
        return orm

    async def delete_group_access(self, group_id: str) -> bool:
        orm = await KpiGroupAccessOrm.get_or_none(group_id=group_id)
        if orm is None:
            return False
        await orm.delete()
        return True

    async def get_kpi_keys_for_groups(self, group_ids: list[str]) -> set[str]:
        """Retourne l'union des clés KPI autorisées pour une liste de groupes."""
        if not group_ids:
            return set()
        records = await KpiGroupAccessOrm.filter(group_id__in=group_ids)
        result: set[str] = set()
        for r in records:
            result.update(r.kpi_keys or [])
        return result
