"""Router /companies : CRUD entités juridiques.

La liste des entreprises est lue depuis la base locale.
La synchronisation depuis Odoo est déclenchée explicitement via POST /companies/sync.
"""

import asyncio
import logging
import xmlrpc.client
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CompanyRepoDep, require_permission
from app.api.v1.schemas.companies import CompanyCreate, CompanyOut, CompanyUpdate
from app.api.v1.schemas.pagination import Page, PageParams
from app.application.companies.create_company import (
    CreateCompanyInput,
    CreateCompanyUseCase,
)
from app.application.companies.get_company import GetCompanyUseCase
from app.application.companies.list_companies import ListCompaniesUseCase
from app.application.companies.sync_from_odoo import SyncCompaniesFromOdooUseCase
from app.application.companies.update_company import UpdateCompanyInput, UpdateCompanyUseCase
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("company:create"))],
)
async def create_company(payload: CompanyCreate, company_repo: CompanyRepoDep) -> CompanyOut:
    """Crée l'entreprise dans Odoo en premier (si configuré), puis en base locale.

    L'`erp_id` retourné par Odoo est automatiquement associé à l'entité locale.
    Si Odoo n'est pas configuré, la création se fait uniquement en local sans `erp_id`.
    """
    from app.infrastructure.odoo.client import OdooClient

    erp_id: int | None = None

    if settings.odoo_url and settings.odoo_db:
        try:
            oc = OdooClient()
            erp_id = await asyncio.to_thread(
                oc.create_company,
                payload.name,
                payload.country.value,
                payload.email,
                payload.phone,
                payload.website,
                payload.address,
            )
            logger.info("company.odoo_created erp_id=%d name=%s", erp_id, payload.name)
        except xmlrpc.client.Fault as exc:
            logger.warning("company.odoo_business_error name=%s fault=%s", payload.name, exc.faultString)
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=f"Odoo : {exc.faultString}",
            ) from exc
        except Exception as exc:
            logger.error("company.odoo_create_failed name=%s error=%s", payload.name, exc)
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Le serveur ERP (Odoo) est injoignable. Veuillez réessayer plus tard.",
            ) from exc

    company = await CreateCompanyUseCase(company_repo).execute(
        CreateCompanyInput(
            name=payload.name,
            country=payload.country,
            default_currency=payload.default_currency,
            parent_company_id=payload.parent_company_id,
            erp_id=erp_id,
            email=payload.email,
            phone=payload.phone,
            website=payload.website,
            address=payload.address,
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


@router.patch(
    "/{company_id}",
    dependencies=[Depends(require_permission("company:update"))],
)
async def update_company(
    company_id: UUID,
    payload: CompanyUpdate,
    company_repo: CompanyRepoDep,
) -> CompanyOut:
    """Met à jour le nom et/ou les coordonnées d'une entreprise.

    Si l'entreprise est rattachée à Odoo (erp_id présent), la mise à jour
    est d'abord appliquée dans Odoo. En cas d'échec Odoo, la BD locale
    n'est pas modifiée.
    """
    from app.infrastructure.odoo.client import OdooClient

    from app.application.shared.exceptions import NotFoundError
    try:
        company = await UpdateCompanyUseCase(company_repo).execute(
            company_id,
            UpdateCompanyInput(
                name=payload.name,
                email=payload.email,
                phone=payload.phone,
                website=payload.website,
                address=payload.address,
            ),
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if company.erp_id is not None and settings.odoo_url and settings.odoo_db:
        try:
            oc = OdooClient()
            await asyncio.to_thread(
                oc.update_company,
                company.erp_id,
                payload.name,
                payload.email,
                payload.phone,
                payload.website,
                payload.address,
            )
            logger.info("company.odoo_updated erp_id=%d", company.erp_id)
        except xmlrpc.client.Fault as exc:
            logger.warning("company.odoo_update_business_error erp_id=%d fault=%s", company.erp_id, exc.faultString)
            raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Odoo : {exc.faultString}") from exc
        except Exception as exc:
            logger.error("company.odoo_update_failed erp_id=%d error=%s", company.erp_id, exc)
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Le serveur ERP (Odoo) est injoignable. Veuillez réessayer plus tard.",
            ) from exc

    return CompanyOut.from_domain(company)
