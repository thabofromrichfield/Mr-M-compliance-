import { NextResponse, NextRequest } from 'next/server';
import { sessionTokenFromRequest } from '@/lib/requestAuth';
import { currentUserFromToken, ensureDefaultUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try { await ensureDefaultUser(); } catch {
    return NextResponse.json({ error: 'sign-in is not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const user = currentUserFromToken(sessionTokenFromRequest(req));
  if (!user) return NextResponse.json({ user: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ user: { id: user.id, email: user.email, totpEnabled: user.totpEnabled } }, { headers: { 'Cache-Control': 'no-store' } });
}
