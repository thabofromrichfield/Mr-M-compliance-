import { NextResponse, NextRequest } from 'next/server';
import { sessionTokenFromRequest } from '@/lib/requestAuth';
import { currentUserFromToken, type User } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import { generateSecret, qrDataUrl } from '@/lib/totp';

export async function POST(req: NextRequest) {
  const token = sessionTokenFromRequest(req);
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { secret, otpauth } = generateSecret(user.email);
  localStore.update<User>('users', user.id, { totpSecret: secret, totpEnabled: false });
  const qr = await qrDataUrl(otpauth);
  return NextResponse.json({ secret, otpauth, qr });
}
