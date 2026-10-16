import { NextResponse, NextRequest } from 'next/server';
import { sessionTokenFromRequest } from '@/lib/requestAuth';
import { destroySession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { sessionCookieOptions } from '@/lib/sessionCookie';

export async function POST(req: NextRequest) {
  const token = sessionTokenFromRequest(req);
  if (token) {
    logAudit(token, 'logout', 'user');
    destroySession(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('session', '', { ...sessionCookieOptions(req, 0), expires: new Date(0) });
  return res;
}
