import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/auth';
import { sessionCookieOptions } from '@/lib/sessionCookie';
import { jsonError, sameOrigin } from '@/lib/http';
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError('Cross-origin request blocked.', 403);
  const user = currentUser(req);
  if (user) await audit(user, 'logout', 'session');
  const response = NextResponse.json({ ok: true });
  response.cookies.set('session', '', { ...sessionCookieOptions(req, 0), expires: new Date(0) });
  return response;
}
