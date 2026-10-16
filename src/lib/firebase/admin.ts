// Firebase Admin SDK initialization (server-side), used when FIREBASE_SERVICE_ACCOUNT_JSON is set.
import { initializeApp, getApps, cert } from 'firebase-admin/app';

export function firebaseAdmin() {
  if (getApps().length) return getApps()[0];
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  return initializeApp({ credential: cert(JSON.parse(sa)) });
}
