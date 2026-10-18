import crypto from 'node:crypto';

export const OWNER_EMAIL = (process.env.OWNER_EMAIL || (process.env.NODE_ENV === 'production' ? '' : 'admin@compliance.app')).trim().toLowerCase();
export const OWNER_PASSWORD = process.env.OWNER_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Compliance123!');
export const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-demo-session-secret-please-change');
export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
export const CRON_SECRET = process.env.CRON_SECRET || '';
export const ALERT_RECIPIENTS = [...new Set((process.env.ALERT_RECIPIENTS || '').split(',').map((item) => item.trim().toLowerCase()).filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)))];
export const isProduction = process.env.NODE_ENV === 'production';
export const DEMO_ENCRYPTION_KEY = crypto.createHash('sha256').update('clearledger-local-demo-only-encryption-key').digest();
