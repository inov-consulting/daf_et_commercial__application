// ─── Firebase Messaging Service Worker ───────────────────────────────────────
// Gère les notifications push en arrière-plan (onglet fermé ou caché).
// Ce fichier DOIT être servi depuis la racine : /firebase-messaging-sw.js
//
// ⚠ Remplacer les valeurs __PLACEHOLDER__ ci-dessous par votre config Firebase.
//   Ces valeurs sont volontairement publiques — la sécurité repose sur les
//   Firebase Security Rules, pas sur le secret de la config.
//
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyA7bLMN3us8wXSDYafb5ugOqJNkw0Ctxhg',
  authDomain:        'portalis-4add6.firebaseapp.com',
  projectId:         'portalis-4add6',
  storageBucket:     'portalis-4add6.firebasestorage.app',
  messagingSenderId: '184225511344',
  appId:             '1:184225511344:web:6a1f4a600c3af9d6830875',
});

const messaging = firebase.messaging();

// Affiche une notification native quand l'onglet est en arrière-plan
messaging.onBackgroundMessage(payload => {
  const notif = payload.notification ?? {};
  self.registration.showNotification(notif.title ?? 'Portalis', {
    body:  notif.body  ?? '',
    icon:  notif.icon  ?? '/assets/logo.png',
    badge: '/assets/logo.png',
    data:  payload.data ?? {},
    tag:   payload.collapseKey ?? 'portalis-notification',
  });
});

// Clic sur la notification → focus ou ouverture de l'app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
