"""Schémas Pydantic pour les groupes Keycloak."""

from pydantic import BaseModel, Field


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class GroupRoleAssign(BaseModel):
    role_names: list[str] = Field(..., min_length=1)
