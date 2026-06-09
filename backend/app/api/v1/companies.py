"""Router /companies : CRUD entités juridiques.

La liste des entreprises est lue depuis la base locale.
La synchronisation depuis Odoo est déclenchée explicitement via POST /companies/sync.
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CompanyRepoDep, require_permission
from app.api.v1.schemas.companies import CompanyCreate, CompanyOut
from app.api.v1.schemas.pagination import Page, PageParams
from app.application.companies.create_company import (
    CreateCompanyInput,
    CreateCompanyUseCase,
)
from app.application.companies.get_company import GetCompanyUseCase
from app.application.companies.list_companies import ListCompaniesUseCase
from app.application.companies.sync_from_odoo import SyncCompaniesFromOdooUseCase
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("company:create"))],
)
async def create_company(payload: CompanyCreate, company_repo: CompanyRepoDep) -> CompanyOut:
    company = await CreateCompanyUseCase(company_repo).execute(
        CreateCompanyInput(
            name=payload.name,
            country=payload.country,
            default_currency=payload.default_currency,
            parent_company_id=payload.parent_company_id,
        )
    )
    return CompanyOut.from_domain(company)


@router.get("")
async def list_companies(
    company_repo: CompanyRepoDep,
    params: Annotated[PageParams, Depends()],
) -> Page[CompanyOut]:
    companies = await ListCompaniesUseCase(company_repo).execute(
        limit=params.limit,
        offset=params.offset,
    )
    items = [CompanyOut.from_domain(c) for c in companies]
    return Page(items=items, limit=params.limit, offset=params.offset, count=len(items))


@router.post(
    "/sync",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("company:create"))],
)
async def sync_companies_from_odoo(company_repo: CompanyRepoDep) -> None:
    """Déclenche la synchronisation des entreprises depuis Odoo."""
    if not (settings.odoo_url and settings.odoo_db):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Odoo non configuré",
        )
    try:
        await SyncCompaniesFromOdooUseCase(company_repo).execute()
    except Exception as exc:
        logger.warning("Échec sync Odoo : %s", exc)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Odoo indisponible : {exc}",
        ) from exc


@router.get("/{company_id}")
async def get_company(company_id: UUID, company_repo: CompanyRepoDep) -> CompanyOut:
    company = await GetCompanyUseCase(company_repo).execute(company_id)
    return CompanyOut.from_domain(company)
