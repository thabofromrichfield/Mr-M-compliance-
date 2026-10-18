import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { totpEnabled } from '@/lib/auth';
export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return NextResponse.json({ user: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ user: { email: user, totpEnabled: await totpEnabled() } }, { headers: { 'Cache-Control': 'no-store' } });
}
