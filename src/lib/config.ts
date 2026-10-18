import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Demo is the default, including hosted production builds. Explicitly opt out for real use.
export const DEMO_MODE = process.env.DEMO_MODE !== 'false';
export const OWNER_EMAIL = (DEMO_MODE ? 'admin@compliance.app' : process.env.OWNER_EMAIL || '').trim().toLowerCase();
export const OWNER_PASSWORD = DEMO_MODE ? 'Compliance123!' : process.env.OWNER_PASSWORD || '';
function demoSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  // Never sign hosted sessions with a publicly known demo secret.
  const directory = path.join(os.tmpdir(), 'clearledger-demo');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'session-secret');
  try { fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  return fs.readFileSync(file, 'utf8');
}
export const SESSION_SECRET = DEMO_MODE ? demoSessionSecret() : process.env.SESSION_SECRET || '';
export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
export const CRON_SECRET = process.env.CRON_SECRET || '';
export const ALERT_RECIPIENTS = [...new Set((process.env.ALERT_RECIPIENTS || '').split(',').map((item) => item.trim().toLowerCase()).filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)))];
export const isProduction = process.env.NODE_ENV === 'production';
export const DEMO_ENCRYPTION_KEY = crypto.createHash('sha256').update('clearledger-local-demo-only-encryption-key').digest();
