"""Use case : synchroniser les entreprises depuis Odoo vers la DB locale."""

from __future__ import annotations

from app.domain.shared.company import Company
from app.infrastructure.odoo.client import OdooClient
from app.infrastructure.odoo.mapper import map_odoo_company_to_domain


class SyncCompaniesFromOdooUseCase:
    """Récupère les companies actives depuis Odoo et les persiste en local."""

    def __init__(self, company_repo: "CompanyRepository") -> None:
        self._repo = company_repo

    async def execute(self) -> list[Company]:
        """Sync toutes les entreprises actives d'Odoo.

        Retourne la liste des entités persistées (ou mises à jour).
        """
        oc = OdooClient()
        odoo_companies = oc.list_companies()

        synced: list[Company] = []
        for odoo_c in odoo_companies:
            domain_c = map_odoo_company_to_domain(odoo_c)
            if domain_c is None:
                continue  # mapping impossible (pays/devise inconnus)

            existing = await self._repo.get_by_id(domain_c.id)
            if existing is not None:
                await self._repo.update(domain_c)
            else:
                await self._repo.add(domain_c)
            synced.append(domain_c)

        return synced
