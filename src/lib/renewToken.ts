import crypto from 'crypto';
import { SESSION_SECRET } from './config';

export function makeRenewToken(docId: string) {
  const payload = `${docId}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function parseRenewToken(tok: string): string | null {
  try {
    const raw = Buffer.from(tok, 'base64url').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 3) return null;
    const [docId, ts, sig] = parts;
    const payload = `${docId}:${ts}`;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    // optional expiry: token valid 30 days
    if (Date.now() - Number(ts) > 1000 * 60 * 60 * 24 * 30) return null;
    return docId;
  } catch {
    return null;
  }
}
