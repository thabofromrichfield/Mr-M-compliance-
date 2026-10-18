import crypto from 'node:crypto';

// Demo is the default, including hosted production builds. Explicitly opt out for real use.
export const DEMO_MODE = process.env.DEMO_MODE !== 'false';
export const OWNER_EMAIL = (DEMO_MODE ? 'admin@compliance.app' : process.env.OWNER_EMAIL || '').trim().toLowerCase();
export const OWNER_PASSWORD = DEMO_MODE ? 'Compliance123!' : process.env.OWNER_PASSWORD || '';
export const SESSION_SECRET = DEMO_MODE ? 'local-demo-session-secret-please-change' : process.env.SESSION_SECRET || '';
export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
export const CRON_SECRET = process.env.CRON_SECRET || '';
export const ALERT_RECIPIENTS = [...new Set((process.env.ALERT_RECIPIENTS || '').split(',').map((item) => item.trim().toLowerCase()).filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)))];
export const isProduction = process.env.NODE_ENV === 'production';
export const DEMO_ENCRYPTION_KEY = crypto.createHash('sha256').update('clearledger-local-demo-only-encryption-key').digest();
