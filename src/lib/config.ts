export const APP_NAME = process.env.APP_NAME || 'ClearLedger';
export const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-demo-session-secret-change-me');
export const APP_BASE_URL = process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
export const CRON_SECRET = process.env.CRON_SECRET || '';
export const DEFAULT_EMAIL = (process.env.DEFAULT_EMAIL || (process.env.NODE_ENV === 'production' ? '' : 'admin@compliance.app')).trim().toLowerCase();
export const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Compliance123!');
export const ALERT_RECIPIENTS = (process.env.ALERT_RECIPIENTS || '').split(',').map((address) => address.trim()).filter(Boolean);
export const isFirebaseConfigured = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
