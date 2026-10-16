import type { NextRequest } from 'next/server';

/** Use the opaque session cookie where available, with a bearer fallback for iframe previews. */
export function sessionTokenFromRequest(request: NextRequest): string | undefined {
  const authorization = request.headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    const token = authorization.slice(7).trim();
    if (token.length >= 32 && token.length <= 256) return token;
  }
  return request.cookies.get('session')?.value;
}
