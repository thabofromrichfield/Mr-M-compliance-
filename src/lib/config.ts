export const APP_NAME = process.env.APP_NAME || 'Compliance App';
export const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL || '').trim().toLowerCase();
export const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
export const DATA_DIR = process.env.DATA_DIR || './.data';
export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
export const CRON_SECRET = process.env.CRON_SECRET || '';
export const DEFAULT_EMAIL = (process.env.DEFAULT_EMAIL || 'admin@compliance.app').trim().toLowerCase();
export const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'Compliance123!';
export const ALERT_RECIPIENTS = (process.env.ALERT_RECIPIENTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isFirebaseConfigured() {
  return !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
}
