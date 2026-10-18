import 'server-only';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verify as verifyOtp } from 'otplib';
import { OWNER_EMAIL, OWNER_PASSWORD, SESSION_SECRET, isProduction } from './config';
import { getRecord, saveRecord } from './data';

const TOTP_ID = 'owner-totp';
const TTL = '12h';
interface TotpSetting { id: string; secret: string; enabled: boolean; }

export async function ownerTotp(): Promise<TotpSetting | undefined> {
  return getRecord<TotpSetting>('settings', TOTP_ID);
}
export async function createTotpSetup() {
  if ((await ownerTotp())?.enabled) throw new Error('Two-factor authentication is already enabled.');
  const secret = generateSecret();
  await saveRecord('settings', { id: TOTP_ID, secret, enabled: false });
  return { secret, uri: generateURI({ issuer: 'ClearLedger', label: OWNER_EMAIL, secret }) };
}
export async function confirmTotp(code: string) {
  const setting = await ownerTotp();
  if (!setting || !(await verifyOtp({ token: code, secret: setting.secret })).valid) return false;
  await saveRecord('settings', { ...setting, enabled: true });
  return true;
}
export async function removeTotp(code: string) {
  const setting = await ownerTotp();
  if (!setting?.enabled || !(await verifyOtp({ token: code, secret: setting.secret })).valid) return false;
  await saveRecord('settings', { id: TOTP_ID, secret: '', enabled: false });
  return true;
}
export async function totpEnabled() {
  return (await ownerTotp())?.enabled === true;
}
export async function verifyTotp(code: string, secret: string) {
  return (await verifyOtp({ token: code, secret })).valid;
}
export function verifyOwnerPassword(email: string, password: string) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD || email.trim().toLowerCase() !== OWNER_EMAIL) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(OWNER_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function signSession() {
  if (SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return jwt.sign({ email: OWNER_EMAIL }, SESSION_SECRET, { algorithm: 'HS256', issuer: 'ClearLedger', audience: 'clearledger', expiresIn: TTL });
}
export function userFromToken(token?: string | null): string | null {
  if (!token || SESSION_SECRET.length < 32) return null;
  try {
    const claims = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'], issuer: 'ClearLedger', audience: 'clearledger' });
    if (typeof claims === 'string' || claims.email !== OWNER_EMAIL) return null;
    return OWNER_EMAIL;
  } catch { return null; }
}
export function tokenFromRequest(req: Request): string | undefined {
  const cookie = req.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith('session='))?.slice(8);
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const preview = req.headers.get('x-clearledger-session');
  return [preview, bearer, cookie].find((value): value is string => Boolean(value && value.length >= 32 && value.length <= 512));
}
export function currentUser(req: Request) {
  return userFromToken(tokenFromRequest(req));
}
export const isProductionAuth = isProduction;
