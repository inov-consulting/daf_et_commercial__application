"""Middleware pour logger automatiquement les requêtes API.

Enregistre chaque requête/réponse dans la table api_request_logs.
"""
from __future__ import annotations

import json
import time
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.infrastructure.db.models.api_log import ApiRequestLogOrm


class ApiLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware qui logue toutes les requêtes HTTP dans la DB."""

    # Routes à exclure du logging
    # ⚠️ Les endpoints SSE (stream) DOIVENT être exclus — BaseHTTPMiddleware
    # bufferise le body entier ce qui casse les réponses streaming.
    EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
    EXCLUDED_SUFFIXES = {"/stream"}

    async def dispatch(self, request: Request, call_next):
        # Ignorer les routes exclues et les WebSocket/SSE (streaming)
        path = request.url.path
        if any(path.startswith(p) for p in self.EXCLUDED_PATHS):
            return await call_next(request)
        if any(path.endswith(s) for s in self.EXCLUDED_SUFFIXES):
            return await call_next(request)
        # Laisser passer les upgrades WebSocket sans buffering
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)

        start_time = time.time()
        log_entry = None

        try:
            # Capturer le body de la requête si possible
            request_body = None
            if request.method in ("POST", "PUT", "PATCH"):
                try:
                    body = await request.body()
                    if body:
                        try:
                            request_body = json.loads(body)
                        except json.JSONDecodeError:
                            request_body = body.decode("utf-8", errors="replace")[:10000]
                except Exception:
                    pass

            # Récupérer l'utilisateur depuis le token JWT si présent
            user_id = None
            user_email = None
            try:
                auth_header = request.headers.get("authorization", "")
                if auth_header.startswith("Bearer "):
                    token = auth_header.replace("Bearer ", "")
                    # Décoder le token sans vérifier la signature (juste pour le logging)
                    import jwt
                    payload = jwt.decode(token, options={"verify_signature": False})
                    user_id = payload.get("sub")
                    user_email = payload.get("email")
            except Exception:
                pass

            # Préparer le log
            log_data = {
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "request_body": request_body,
                "request_headers": self._sanitize_headers(dict(request.headers)),
                "user_id": user_id,
                "user_email": user_email,
                "ip_address": self._get_client_ip(request),
                "user_agent": request.headers.get("user-agent"),
            }

            # Appeler le endpoint
            response = await call_next(request)

            # Calculer la durée
            duration_ms = int((time.time() - start_time) * 1000)

            # Capturer la réponse si possible
            response_body = None
            response_size = None
            if hasattr(response, "body"):
                try:
                    body = response.body
                    response_size = len(body)
                    if response_size < 10000:  # Limiter à 10KB
                        try:
                            response_body = json.loads(body)
                        except json.JSONDecodeError:
                            response_body = body.decode("utf-8", errors="replace")
                except Exception:
                    pass

            # Enregistrer le log
            log_data.update({
                "status_code": response.status_code,
                "response_body": response_body,
                "response_size_bytes": response_size,
                "duration_ms": duration_ms,
                "is_error": response.status_code >= 400,
            })

            # Créer l'entrée en DB (fire and forget, ne pas bloquer la réponse)
            import asyncio
            asyncio.create_task(self._save_log(log_data))

            return response

        except Exception as exc:
            # En cas d'erreur, logger quand même
            if log_entry is None:
                duration_ms = int((time.time() - start_time) * 1000)
                log_data = {
                    "method": request.method,
                    "path": request.url.path,
                    "query_params": dict(request.query_params),
                    "error_message": str(exc)[:1000],
                    "is_error": True,
                    "duration_ms": duration_ms,
                    "ip_address": self._get_client_ip(request),
                    "user_agent": request.headers.get("user-agent"),
                }
                import asyncio
                asyncio.create_task(self._save_log(log_data))
            raise

    @staticmethod
    def _sanitize_headers(headers: dict) -> dict:
        """Supprime les headers sensibles (auth, cookies)."""
        sensitive = {"authorization", "cookie", "x-api-key", "set-cookie"}
        return {
            k: v for k, v in headers.items()
            if k.lower() not in sensitive
        }

    @staticmethod
    def _get_client_ip(request: Request) -> str | None:
        """Extrait l'IP client depuis les headers."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else None

    @staticmethod
    async def _save_log(data: dict) -> None:
        """Sauvegarde le log en DB (async, ne bloque pas la réponse)."""
        try:
            await ApiRequestLogOrm.create(**data)
        except Exception:
            # Ignorer les erreurs de logging pour ne pas casser l'API
            pass
