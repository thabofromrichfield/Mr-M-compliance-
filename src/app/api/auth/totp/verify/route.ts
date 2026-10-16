import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken, type User } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import { verifyToken } from '@/lib/totp';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { code } = await req.json();
  const fresh = localStore.get<User>('users', user.id);
  if (!fresh?.totpSecret) return NextResponse.json({ error: 'setup first' }, { status: 400 });
  const ok = await verifyToken(fresh.totpSecret, String(code));
  if (!ok) {
    return NextResponse.json({ error: 'invalid code' }, { status: 400 });
  }
  localStore.update<User>('users', user.id, { totpEnabled: true });
  logAudit(token, 'totp_enable', 'user', user.id);
  return NextResponse.json({ ok: true });
}
