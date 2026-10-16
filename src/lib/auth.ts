import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { localStore } from './store/local';
import { APP_NAME, DEFAULT_EMAIL, DEFAULT_PASSWORD, SESSION_SECRET } from './config';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  totpSecret?: string;
  totpEnabled: boolean;
  createdAt: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const SESSION_ISSUER = APP_NAME;
const SESSION_AUDIENCE = 'clearledger';

/**
 * Use an owner ID derived from the configured owner identity. Serverless
 * instances may have isolated filesystems, so a randomly seeded ID would make
 * a valid sign-in token look like an unknown user on the next request.
 */
function defaultOwnerId() {
  return `owner-${crypto.createHash('sha256').update(`clearledger:${DEFAULT_EMAIL}`).digest('hex').slice(0, 32)}`;
}

async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function findUserByEmail(email: string) {
  return localStore.list<User>('users').find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function getUserById(id: string) {
  const stored = localStore.get<User>('users', id);
  if (stored) return stored;
  // The configured owner is deterministic and may not yet have been seeded on
  // this serverless instance. This identity is sufficient for auth checks;
  // password and 2FA setup still require the persisted owner record.
  if (DEFAULT_EMAIL && id === defaultOwnerId()) {
    return {
      id,
      email: DEFAULT_EMAIL,
      passwordHash: '',
      totpEnabled: false,
      createdAt: '',
    } satisfies User;
  }
  return undefined;
}

export async function createSession(userId: string) {
  if (SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  return jwt.sign({}, SESSION_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    issuer: SESSION_ISSUER,
    audience: SESSION_AUDIENCE,
    expiresIn: SESSION_TTL_SECONDS,
  });
}

/** Sessions are signed and stateless so they remain valid across serverless instances. */
function sessionSubject(token: string): string | undefined {
  if (SESSION_SECRET.length < 32) return undefined;
  try {
    const claims = jwt.verify(token, SESSION_SECRET, {
      algorithms: ['HS256'],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    return typeof claims === 'string' || typeof claims.sub !== 'string' ? undefined : claims.sub;
  } catch {
    return undefined;
  }
}

export function currentUserFromToken(token: string | undefined): User | undefined {
  if (!token) return undefined;
  const subject = sessionSubject(token);
  return subject ? getUserById(subject) : undefined;
}

function assertAuthConfiguration() {
  if (!DEFAULT_EMAIL || !DEFAULT_PASSWORD) {
    throw new Error('Set DEFAULT_EMAIL and DEFAULT_PASSWORD before enabling production sign-in.');
  }
  if (SESSION_SECRET.length < 32) {
    throw new Error('Set SESSION_SECRET to a random value of at least 32 characters before enabling sign-in.');
  }
}

export async function ensureDefaultUser() {
  assertAuthConfiguration();
  const users = localStore.list<User>('users');
  const owner = users.find((user) => user.email.toLowerCase() === DEFAULT_EMAIL);
  if (!owner) {
    const user: User = {
      id: defaultOwnerId(),
      email: DEFAULT_EMAIL,
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
      totpEnabled: false,
      createdAt: new Date().toISOString(),
    };
    localStore.replaceAll('users', [user]);
    return;
  }
  // Enforce one account and a deterministic ID for stateless serverless auth.
  const normalizedOwner = { ...owner, id: defaultOwnerId(), email: DEFAULT_EMAIL };
  if (users.length !== 1 || owner.id !== normalizedOwner.id || owner.email !== normalizedOwner.email) {
    localStore.replaceAll('users', [normalizedOwner]);
  }
}
