"""Schémas Pydantic de pagination réutilisables."""

from pydantic import BaseModel, Field


class PageParams(BaseModel):
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


class Page[T](BaseModel):
    items: list[T]
    limit: int
    offset: int
    count: int  # nombre d'éléments retournés sur cette page
