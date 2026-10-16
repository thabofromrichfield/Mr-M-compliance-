import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken, ensureDefaultUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await ensureDefaultUser();
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, email: user.email, totpEnabled: user.totpEnabled } });
}
