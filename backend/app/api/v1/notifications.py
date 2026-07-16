"""Router Notifications — gestion des appareils FCM et envoi de notifications push.

Ce router est indépendant de WhatsApp. Les tokens FCM enregistrés ici sont utilisés
par n'importe quel module de l'application (WhatsApp, alertes DAF, etc.).

Endpoints :
  PUT    /notifications/devices/register    → enregistrer un appareil (FCM token)
  DELETE /notifications/devices/unregister  → supprimer un appareil
  GET    /notifications/devices             → liste des appareils de l'utilisateur courant
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from app.api.deps import require_permission

router = APIRouter(prefix="/notifications", tags=["notifications"])

_auth = [Depends(require_permission("app:read"))]


# ── Schémas ───────────────────────────────────────────────────────────────────

class RegisterDeviceIn(BaseModel):
    fcm_token: str
    platform: str | None = None    # "android" | "ios" | "web"
    device_name: str | None = None  # "Samsung Galaxy S24", "Chrome sur Mac"


class DeviceOut(BaseModel):
    id: UUID
    fcm_token: str
    platform: str | None
    device_name: str | None
    last_seen_at: datetime | None
    created_at: datetime


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.put("/devices/register", dependencies=_auth, status_code=status.HTTP_200_OK)
async def register_device(body: RegisterDeviceIn, request: Request) -> dict:
    """Enregistre ou met à jour le token FCM de l'appareil courant.

    À appeler :
    - Au démarrage de l'app Flutter/Web
    - Quand FCM rafraîchit le token (onTokenRefresh)

    Un même token FCM n'est stocké qu'une fois (upsert). Si le token existe déjà
    (autre user ou autre session), il est réassocié à l'utilisateur courant.
    """
    from app.infrastructure.db.models.user_device import UserDeviceOrm

    user_id: UUID | None = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non identifié")

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


@router.delete("/devices/unregister", dependencies=_auth, status_code=status.HTTP_200_OK)
async def unregister_device(fcm_token: str = Query(...)) -> dict:
    """Supprime un token FCM (déconnexion de l'utilisateur ou changement d'appareil)."""
    from app.infrastructure.db.models.user_device import UserDeviceOrm

    deleted = await UserDeviceOrm.filter(fcm_token=fcm_token).delete()
    return {"unregistered": deleted > 0}


@router.get("/devices", dependencies=_auth)
async def list_my_devices(request: Request) -> list[DeviceOut]:
    """Liste tous les appareils enregistrés pour l'utilisateur courant."""
    from app.infrastructure.db.models.user_device import UserDeviceOrm

    user_id: UUID | None = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non identifié")

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
