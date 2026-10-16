import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import { findUserByEmail, verifyPassword, createSession } from '@/lib/auth';
import { verifyToken } from '@/lib/totp';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { email, password, totp } = await req.json();
  const user = findUserByEmail(String(email || ''));
  if (!user) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });
  const ok = await verifyPassword(String(password || ''), user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 });
  if (user.totpEnabled) {
    if (!totp) return NextResponse.json({ requires2fa: true }, { status: 200 });
    if (!verifyToken(user.totpSecret!, String(totp))) {
      return NextResponse.json({ error: 'invalid 2fa code' }, { status: 401 });
    }
  }
  const token = await createSession(user.id);
  logAudit(token, 'login', 'user', user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
