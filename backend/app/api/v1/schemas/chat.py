"""Schémas Pydantic Chat / AI."""

from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: UUID | None = None
    message: str
    reasoning: bool = False  # Active le mode raisonnement (chain-of-thought)


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
