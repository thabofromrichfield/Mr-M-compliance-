import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { localStore } from './store/local';
import { DEFAULT_EMAIL, DEFAULT_PASSWORD } from './config';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  totpSecret?: string;
  totpEnabled: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function findUserByEmail(email: string) {
  return localStore.list<User>('users').find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string) {
  return localStore.get<User>('users', id);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const session: Session & { id: string } = {
    id: token,
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  localStore.insert('sessions', session);
  return token;
}

export function getSession(token: string): Session | undefined {
  const found = localStore.list<Session>('sessions').find((x) => x.token === token);
  if (!found) return undefined;
  if (new Date(found.expiresAt).getTime() < Date.now()) {
    localStore.remove('sessions', found.token);
    return undefined;
  }
  return found;
}

export function destroySession(token: string) {
  const found = localStore.list<Session>('sessions').find((x) => x.token === token);
  if (found) localStore.remove('sessions', found.token);
}

export function currentUserFromToken(token: string | undefined): User | undefined {
  if (!token) return undefined;
  const s = getSession(token);
  if (!s) return undefined;
  return getUserById(s.userId);
}

export function userCount() {
  return localStore.list<User>('users').length;
}


export async function ensureDefaultUser() {
  if (!DEFAULT_EMAIL || !DEFAULT_PASSWORD) {
    throw new Error('Set DEFAULT_EMAIL and DEFAULT_PASSWORD before enabling production sign-in.');
  }
  const users = localStore.list<User>('users');
  const owner = users.find((user) => user.email.toLowerCase() === DEFAULT_EMAIL);
  if (owner) {
    // Enforce the single-owner model even if old demo data contains extra accounts.
    if (users.length !== 1) localStore.replaceAll('users', [owner]);
    return;
  }
  const user: User = {
    id: crypto.randomUUID(),
    email: DEFAULT_EMAIL,
    passwordHash: await hashPassword(DEFAULT_PASSWORD),
    totpEnabled: false,
    createdAt: new Date().toISOString(),
  };
  localStore.replaceAll('users', [user]);
}
