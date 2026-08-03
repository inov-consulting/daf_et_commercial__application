"""Schémas Pydantic Chat / AI."""

from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: UUID | None = None
    message: str
    reasoning: bool = False
    erp_company_id: int | None = None  # ID Odoo res.company pour filtrer les données


class ChatResponse(BaseModel):
    session_id: UUID
    response: str
    tool_used: str | None
    turn: int


class ToolInfo(BaseModel):
    name: str
    description: str


class TranscribeResponse(BaseModel):
    text: str
