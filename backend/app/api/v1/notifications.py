"""Router Notifications — historique, badge et temps réel.

Endpoints :
  GET    /notifications                → liste des notifications de l'utilisateur
  GET    /notifications/unread-count   → nombre de notifications non lues (badge)
  PATCH  /notifications/{id}/read      → marquer une notification comme lue
  PATCH  /notifications/read-all       → marquer toutes comme lues
  WS     /notifications/stream         → flux temps réel (WebSocket)

  PUT    /notifications/devices/register    → enregistrer un appareil (FCM token)
  DELETE /notifications/devices/unregister  → supprimer un appareil
  GET    /notifications/devices             → liste des appareils de l'utilisateur
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from app.api.deps import require_permission

router = APIRouter(prefix="/notifications", tags=["notifications"])

_auth = [Depends(require_permission("notification:read"))]
_auth_create = [Depends(require_permission("notification:create"))]
_auth_delete = [Depends(require_permission("notification:delete"))]
_auth_delete = [Depends(require_permission("notification:delete"))]

# ── Schémas ───────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: UUID
    notification_type: str
    title: str
    body: str
    status: str
    reference_type: str | None
    reference_id: UUID | None
    data: dict | None
    created_at: datetime
    read_at: datetime | None


class RegisterDeviceIn(BaseModel):
    fcm_token: str
    platform: str | None = None
    device_name: str | None = None


class DeviceOut(BaseModel):
    id: UUID
    fcm_token: str
    platform: str | None
    device_name: str | None
    last_seen_at: datetime | None
    created_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_id(request: Request) -> UUID:
    user_id: UUID | None = getattr(request.state, "user_id", None)
    if not user_id:
        # Tenter depuis keycloak_payload
        payload = getattr(request.state, "keycloak_payload", {}) or {}
        sub = payload.get("sub")
        if sub:
            try:
                return UUID(sub)
            except ValueError:
                pass
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non identifié")
    return user_id


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("", dependencies=_auth)
async def list_notifications(
    request: Request,
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    """Liste les notifications de l'utilisateur avec le total non lu."""
    from app.infrastructure.db.models.notification import NotificationOrm

    user_id = _get_user_id(request)
    qs = NotificationOrm.filter(user_id=user_id)
    if unread_only:
        qs = qs.filter(status="unread")

    total_unread = await NotificationOrm.filter(user_id=user_id, status="unread").count()
    notifications = await qs.order_by("-created_at").offset(offset).limit(limit)

    return {
        "unread_count": total_unread,
        "items": [
            NotificationOut(
                id=n.id,
                notification_type=n.notification_type,
                title=n.title,
                body=n.body,
                status=n.status,
                reference_type=n.reference_type,
                reference_id=n.reference_id,
                data=n.data,
                created_at=n.created_at,
                read_at=n.read_at,
            )
            for n in notifications
        ],
    }


@router.get("/unread-count", dependencies=_auth)
async def unread_count(request: Request) -> dict:
    """Retourne uniquement le nombre de notifications non lues (pour le badge)."""
    from app.infrastructure.db.models.notification import NotificationOrm

    user_id = _get_user_id(request)
    count = await NotificationOrm.filter(user_id=user_id, status="unread").count()
    return {"unread_count": count}


@router.patch("/{notification_id}/read", dependencies=_auth)
async def mark_as_read(notification_id: UUID, request: Request) -> NotificationOut:
    """Marque une notification comme lue."""
    from app.infrastructure.db.models.notification import NotificationOrm

    user_id = _get_user_id(request)
    notif = await NotificationOrm.get_or_none(id=notification_id, user_id=user_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification introuvable")

    if notif.status != "read":
        notif.status = "read"
        notif.read_at = datetime.now(timezone.utc)
        await notif.save()

    return NotificationOut(
        id=notif.id,
        notification_type=notif.notification_type,
        title=notif.title,
        body=notif.body,
        status=notif.status,
        reference_type=notif.reference_type,
        reference_id=notif.reference_id,
        data=notif.data,
        created_at=notif.created_at,
        read_at=notif.read_at,
    )


@router.patch("/read-all", dependencies=_auth)
async def mark_all_read(request: Request) -> dict:
    """Marque toutes les notifications non lues comme lues."""
    from app.infrastructure.db.models.notification import NotificationOrm

    user_id = _get_user_id(request)
    now = datetime.now(timezone.utc)
    updated = await NotificationOrm.filter(user_id=user_id, status="unread").update(
        status="read",
        read_at=now,
    )
    return {"marked_read": updated}


# ── WebSocket temps réel ───────────────────────────────────────────────────────

@router.websocket("/stream")
async def notifications_stream(websocket: WebSocket, token: str | None = Query(None)):
    """WebSocket — reçoit les nouvelles notifications en temps réel.

    Connexion : ws://.../api/v1/notifications/stream?token=<jwt>
    Format reçu :
        {
          "id": "...", "type": "cr_ready", "title": "...", "body": "...",
          "status": "unread", "reference_type": "compte_rendu", "reference_id": "...",
          "created_at": "..."
        }
    """
    from app.infrastructure.notifications.broadcaster import subscribe
    from app.infrastructure.auth.keycloak import KeycloakClient

    # Auth via query param token (EventSource/WebSocket ne supporte pas les headers)
    user_id_str: str | None = None
    if token:
        try:
            kc = KeycloakClient()
            payload = await kc.introspect_token(token)
            if payload:
                user_id_str = kc.extract_sub(payload)
        except Exception:
            pass

    if not user_id_str:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    try:
        async for payload in subscribe(user_id_str):
            await websocket.send_text(json.dumps(payload, default=str))
    except WebSocketDisconnect:
        pass


# ── Appareils FCM ─────────────────────────────────────────────────────────────

@router.put("/devices/register", dependencies=_auth_create, status_code=status.HTTP_200_OK)
async def register_device(body: RegisterDeviceIn, request: Request) -> dict:
    """Enregistre ou met à jour le token FCM de l'appareil courant."""
    from app.infrastructure.db.models.user_device import UserDeviceOrm

    user_id = _get_user_id(request)
    now = datetime.now(timezone.utc)

    device, created = await UserDeviceOrm.get_or_create(
        fcm_token=body.fcm_token,
        defaults={
            "id": uuid4(),
            "user_id": user_id,
            "platform": body.platform,
            "device_name": body.device_name,
            "last_seen_at": now,
        },
    )
    if not created:
        device.user_id = user_id
        device.platform = body.platform or device.platform
        device.device_name = body.device_name or device.device_name
        device.last_seen_at = now
        await device.save()

    return {"registered": True, "device_id": str(device.id)}


@router.delete("/devices/unregister", dependencies=_auth_delete, status_code=status.HTTP_200_OK)
async def unregister_device(fcm_token: str = Query(...)) -> dict:
    """Supprime un token FCM (déconnexion ou changement d'appareil)."""
    from app.infrastructure.db.models.user_device import UserDeviceOrm

    deleted = await UserDeviceOrm.filter(fcm_token=fcm_token).delete()
    return {"unregistered": deleted > 0}


@router.get("/devices", dependencies=_auth)
async def list_my_devices(request: Request) -> list[DeviceOut]:
    """Liste tous les appareils enregistrés pour l'utilisateur courant."""
    from app.infrastructure.db.models.user_device import UserDeviceOrm

    user_id = _get_user_id(request)
    devices = await UserDeviceOrm.filter(user_id=user_id).order_by("-last_seen_at")
    return [
        DeviceOut(
            id=d.id,
            fcm_token=d.fcm_token,
            platform=d.platform,
            device_name=d.device_name,
            last_seen_at=d.last_seen_at,
            created_at=d.created_at,
        )
        for d in devices
    ]
    