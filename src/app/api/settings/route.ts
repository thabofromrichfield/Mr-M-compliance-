import { NextRequest, NextResponse } from 'next/server';
import { currentUser, totpEnabled } from '@/lib/auth';
import { ALERT_RECIPIENTS } from '@/lib/config';
import { firebaseReady } from '@/lib/firebase';
import { jsonError } from '@/lib/http';
export async function GET(req: NextRequest) {
  if (!currentUser(req)) return jsonError('Sign in required.', 401);
  const ready = Boolean(firebaseReady() && process.env.DOCUMENT_ENCRYPTION_KEY && process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD && process.env.SESSION_SECRET && ALERT_RECIPIENTS.length && process.env.SMTP_HOST && process.env.SMTP_FROM);
  return NextResponse.json({ recipients: ALERT_RECIPIENTS, twoFactorEnabled: await totpEnabled(), storage: firebaseReady() ? 'Firebase Storage' : 'Encrypted local demo storage', productionReady: ready }, { headers: { 'Cache-Control': 'no-store' } });
}
