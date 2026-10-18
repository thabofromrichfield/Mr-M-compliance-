import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { ownerTotp, signSession, verifyOwnerPassword, verifyTotp } from '@/lib/auth';
import { jsonError, sameOrigin } from '@/lib/http';
import { DEMO_MODE } from '@/lib/config';
import { sessionCookieOptions } from '@/lib/sessionCookie';

const attempts = new Map<string, { count: number; since: number }>();
function recordFailure(ip: string, state: { count: number; since: number } | undefined) {
  const next = !state || Date.now() - state.since >= 15 * 60_000 ? { count: 1, since: Date.now() } : { ...state, count: state.count + 1 };
  attempts.set(ip, next);
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError('Cross-origin sign-in request blocked.', 403);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const state = attempts.get(ip);
  if (state && Date.now() - state.since < 15 * 60_000 && state.count >= 8) return jsonError('Too many sign-in attempts. Please wait 15 minutes.', 429);
  try {
    const body = await req.json() as { email?: string; password?: string; totp?: string };
    const valid = verifyOwnerPassword(String(body.email || ''), String(body.password || '').slice(0, 512));
    if (!valid) {
      recordFailure(ip, state);
      await audit('anonymous', 'login_failed', 'session');
      return jsonError('Email or password is incorrect.', 401);
    }
    const totp = await ownerTotp();
    if (totp?.enabled && !body.totp) return NextResponse.json({ requires2fa: true }, { headers: { 'Cache-Control': 'no-store' } });
    if (totp?.enabled && !(await verifyTotp(String(body.totp), totp.secret))) {
      recordFailure(ip, state);
      await audit('anonymous', 'two_factor_failed', 'session');
      return jsonError('Enter a valid two-factor code.', 401);
    }
    attempts.delete(ip);
    const token = signSession();
    await audit(process.env.OWNER_EMAIL || 'owner', 'login', 'session');
    const response = NextResponse.json({ ok: true, ...(DEMO_MODE || process.env.NODE_ENV !== 'production' ? { sessionToken: token } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set('session', token, sessionCookieOptions(req, 60 * 60 * 12));
    return response;
  } catch { return jsonError('Sign-in is not configured or the request is invalid.', 503); }
}
