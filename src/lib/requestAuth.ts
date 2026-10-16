import type { NextRequest } from 'next/server';

/** Use the opaque session cookie where available, with a bearer fallback for iframe previews. */
export function sessionTokenFromRequest(request: NextRequest): string | undefined {
  const candidates = [
    request.headers.get('x-clearledger-session') || '',
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '',
    request.cookies.get('session')?.value || '',
  ];
  return candidates.map((token) => token.trim()).find((token) => token.length >= 32 && token.length <= 256);
}
