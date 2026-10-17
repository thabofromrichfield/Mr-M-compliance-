import type { NextRequest } from 'next/server';
export function sessionCookieOptions(req: NextRequest, maxAge: number) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0]!.trim().toLowerCase();
  const https = process.env.NODE_ENV === 'production' || req.headers.get('x-forwarded-proto') === 'https' || host.endsWith('.e2b.app');
  return { httpOnly: true, secure: https, sameSite: https ? 'none' as const : 'lax' as const, path: '/', maxAge, ...(https ? { partitioned: true } : {}) };
}
