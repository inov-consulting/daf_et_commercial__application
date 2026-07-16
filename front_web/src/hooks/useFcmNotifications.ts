'use client';

import { useEffect, useRef } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messagingReady } from '@/lib/firebase';
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

      const messaging = await messagingReady;
      if (!messaging) return;

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(messaging, {
        vapidKey:                  VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (!token) return;

      dispatch(setFcmToken(token));
      dispatch(registerDevice(token));

      // Notifications en foreground (onglet visible)
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
