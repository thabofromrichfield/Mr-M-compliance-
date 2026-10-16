import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import { ALLOWED_EMAIL } from '@/lib/config';
import { hashPassword, findUserByEmail, userCount } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  const e = String(email).trim().toLowerCase();
  if (ALLOWED_EMAIL && e !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'registration not allowed for this email' }, { status: 403 });
  }
  if (userCount() > 0) {
    return NextResponse.json({ error: 'single-user app: an account already exists' }, { status: 403 });
  }
  if (findUserByEmail(e)) {
    return NextResponse.json({ error: 'user exists' }, { status: 409 });
  }
  const user = {
    id: crypto.randomUUID(),
    email: e,
    passwordHash: await hashPassword(password),
    totpEnabled: false,
    createdAt: new Date().toISOString(),
  };
  localStore.insert('users', user);
  logAudit(undefined, 'register', 'user', user.id, e);
  return NextResponse.json({ ok: true });
}
