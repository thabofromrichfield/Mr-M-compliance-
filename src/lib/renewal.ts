import 'server-only';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { SESSION_SECRET } from './config';

export function isValidExpiryDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function createRenewalToken(documentId: string) {
  if (SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return jwt.sign({ doc: documentId }, SESSION_SECRET, { algorithm: 'HS256', issuer: 'ClearLedger-renewal', audience: 'clearledger-one-click', expiresIn: '90d', jwtid: crypto.randomUUID() });
}
export function verifyRenewalToken(token: string) {
  if (SESSION_SECRET.length < 32) return null;
  try {
    const claims = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'], issuer: 'ClearLedger-renewal', audience: 'clearledger-one-click' });
    if (typeof claims === 'string' || typeof claims.doc !== 'string' || typeof claims.iat !== 'number' || typeof claims.jti !== 'string') return null;
    return { documentId: claims.doc, issuedAt: claims.iat * 1000, tokenId: claims.jti };
  } catch { return null; }
}
