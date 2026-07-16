import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

// ─── Firebase config ──────────────────────────────────────────────────────────
// Ajouter ces variables dans .env.local (et les variables d'env de déploiement) :
//
//   NEXT_PUBLIC_FIREBASE_API_KEY=…
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
//   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
//   NEXT_PUBLIC_FIREBASE_APP_ID=…
//   NEXT_PUBLIC_FIREBASE_VAPID_KEY=…  ← Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
//
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY             ?? '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         ?? '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID          ?? '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET      ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID              ?? '',
};

let firebaseApp: FirebaseApp;
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

export { firebaseApp };

// Messaging n'est disponible que dans les contextes sécurisés (HTTPS) avec
// support des Service Workers. Retourne null sur SSR et navigateurs non supportés.
export const messagingReady: Promise<Messaging | null> = isSupported()
  .then(ok => (ok ? getMessaging(firebaseApp) : null))
  .catch(() => null);
