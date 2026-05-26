"""Mapping erreurs applicatives → HTTPException FastAPI.

Évite de polluer les routers avec des try/except sur chaque appel use case.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.application.shared.exceptions import (
    ApplicationError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def _not_found(_: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=status.HTTP_404_NOT_FOUND)

    @app.exception_handler(ConflictError)
    async def _conflict(_: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=status.HTTP_409_CONFLICT)

    @app.exception_handler(AuthenticationError)
    async def _auth(_: Request, exc: AuthenticationError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=status.HTTP_401_UNAUTHORIZED)

    @app.exception_handler(AuthorizationError)
    async def _forbidden(_: Request, exc: AuthorizationError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=status.HTTP_403_FORBIDDEN)

    @app.exception_handler(ApplicationError)
    async def _generic(_: Request, exc: ApplicationError) -> JSONResponse:
        return JSONResponse({"detail": str(exc)}, status_code=status.HTTP_400_BAD_REQUEST)
