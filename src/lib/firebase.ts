import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { isProduction } from './config';

function app() {
  if (getApps().length) return getApps()[0]!;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const parsed = raw ? JSON.parse(raw) as Record<string, string> : {};
  const service = {
    projectId: parsed.projectId || parsed.project_id || process.env.FIREBASE_PROJECT_ID,
    clientEmail: parsed.clientEmail || parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (parsed.privateKey || parsed.private_key || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
  };
  if (!service.projectId || !service.clientEmail || !service.privateKey || !process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error('Firebase Admin credentials and FIREBASE_STORAGE_BUCKET are required in production.');
  }
  return initializeApp({ credential: cert(service), projectId: service.projectId, storageBucket: process.env.FIREBASE_STORAGE_BUCKET });
}

export function firebaseReady() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) && Boolean(process.env.FIREBASE_STORAGE_BUCKET);
}

export function firestore() {
  if (!firebaseReady() && isProduction) throw new Error('Firebase is not configured.');
  return getFirestore(app());
}
export function storageBucket() {
  if (!firebaseReady() && isProduction) throw new Error('Firebase Storage is not configured.');
  return getStorage(app()).bucket(process.env.FIREBASE_STORAGE_BUCKET);
}
