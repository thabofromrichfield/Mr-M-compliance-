import type { NextRequest } from 'next/server';

/**
 * Arena previews are hosted in an HTTPS iframe on an e2b.app origin, so browsers
 * need a Secure SameSite=None cookie there. Partitioning supports browsers that
 * block ordinary third-party cookies. Direct localhost development remains Lax.
 */
export function sessionCookieOptions(request: NextRequest, maxAge: number) {
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const host = forwardedHost.split(',')[0].trim().toLowerCase();
  const isArenaPreview = host.endsWith('.e2b.app');
  const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim().toLowerCase();
  const secure = process.env.NODE_ENV === 'production' || forwardedProtocol === 'https' || isArenaPreview;

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' as const : 'lax' as const,
    path: '/',
    maxAge,
    ...(secure ? { partitioned: true } : {}),
  };
}
