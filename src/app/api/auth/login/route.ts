import { NextResponse, NextRequest } from 'next/server';
import { findUserByEmail, verifyPassword, createSession, ensureDefaultUser } from '@/lib/auth';
import { verifyToken } from '@/lib/totp';
import { logAudit } from '@/lib/audit';
import { sessionCookieOptions } from '@/lib/sessionCookie';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(key: string) {
  const now = Date.now();
  const state = attempts.get(key);
  if (!state || state.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + WINDOW_MS }); return false; }
  state.count += 1;
  return state.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  let body: { email?: string; password?: string; totp?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid sign-in request.' }, { status: 400 }); }
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const key = `${ip}:${email}`;
  if (tooManyAttempts(key)) return NextResponse.json({ error: 'Too many sign-in attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': '900' } });

  try { await ensureDefaultUser(); } catch {
    return NextResponse.json({ error: 'Sign-in is not configured. Contact the workspace administrator.' }, { status: 503 });
  }
  const user = findUserByEmail(email);
  // Keep the same public response for unknown users and incorrect passwords.
  if (!user || !(await verifyPassword(String(body.password || '').slice(0, 1024), user.passwordHash))) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }
  if (user.totpEnabled) {
    if (!body.totp) return NextResponse.json({ requires2fa: true }, { status: 200 });
    if (!verifyToken(user.totpSecret!, String(body.totp))) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  attempts.delete(key);
  const token = await createSession(user.id);
  logAudit(token, 'login', 'user', user.id);
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set('session', token, sessionCookieOptions(req, 60 * 60 * 12));
  return response;
}
