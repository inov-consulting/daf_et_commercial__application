"""Router /companies : CRUD entités juridiques."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import CompanyRepoDep, require_permission
from app.api.v1.schemas.companies import CompanyCreate, CompanyOut
from app.api.v1.schemas.pagination import Page, PageParams
from app.application.companies.create_company import (
    CreateCompanyInput,
    CreateCompanyUseCase,
)
from app.application.companies.get_company import GetCompanyUseCase
from app.application.companies.list_companies import ListCompaniesUseCase

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post(
    "",
    response_model=CompanyOut,
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


@router.get(
    "",
    response_model=Page[CompanyOut],
    dependencies=[Depends(require_permission("company:read_all"))],
)
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


@router.get(
    "/{company_id}",
    response_model=CompanyOut,
    dependencies=[Depends(require_permission("company:read_all"))],
)
async def get_company(company_id: UUID, company_repo: CompanyRepoDep) -> CompanyOut:
    company = await GetCompanyUseCase(company_repo).execute(company_id)
    return CompanyOut.from_domain(company)
