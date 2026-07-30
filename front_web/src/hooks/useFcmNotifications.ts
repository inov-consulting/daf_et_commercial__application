'use client';

import { useEffect, useRef } from 'react';
import { isSupported, getMessaging, register, onRegistered, onMessage } from 'firebase/messaging';
import { firebaseApp } from '@/lib/firebase';
import { useAppDispatch } from '@/redux/store';
import {
  setFcmToken,
  setPermission,
  addForegroundNotification,
  registerDevice,
  fetchUnreadCount,
} from '@/redux/features/notifications/notificationsSlice';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

export function useFcmNotifications() {
  const dispatch    = useAppDispatch();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      dispatch(setPermission('unsupported'));
      return;
    }

    initialized.current = true;

    (async () => {
      // Vérifier le support FCM avant toute demande de permission
      const supported = await isSupported();
      if (!supported) {
        dispatch(setPermission('unsupported'));
        return;
      }

      const current = Notification.permission;
      let granted   = current === 'granted';

      if (current === 'default') {
        const result = await Notification.requestPermission();
        dispatch(setPermission(result));
        granted = result === 'granted';
      } else {
        dispatch(setPermission(current));
      }

      // Charge le badge dès que l'utilisateur est authentifié, même sans permission push
      dispatch(fetchUnreadCount());

      if (!granted) return;

      const messaging = getMessaging(firebaseApp);
      const swReg     = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      // Firebase 12 : register() + onRegistered() remplace getToken()
      // onRegistered reçoit un Firebase Installation ID (FID) utilisable comme cible backend
      let lastFid: string | null = null;
      onRegistered(messaging, (fid) => {
        if (!fid || fid === lastFid) return;
        lastFid = fid;
        dispatch(setFcmToken(fid));
        dispatch(registerDevice(fid));
      });

      // Déclenche l'enregistrement — le FID arrive via onRegistered
      await register(messaging, {
        vapidKey:                  VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      // Notifications reçues quand l'onglet est visible (foreground)
      onMessage(messaging, payload => {
        dispatch(addForegroundNotification({
          notification_type: (payload.data?.notification_type as string) ?? 'info',
          title:             payload.notification?.title ?? 'Portalis',
          body:              payload.notification?.body  ?? '',
        }));
      });
    })().catch(err => {
      console.error('[FCM] Initialisation échouée :', err);
    });
  }, [dispatch]);
}
