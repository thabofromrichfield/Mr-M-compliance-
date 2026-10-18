import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { audit } from '@/lib/audit';
import { confirmTotp, createTotpSetup, currentUser, removeTotp, ownerTotp } from '@/lib/auth';
import { jsonError, sameOrigin } from '@/lib/http';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError('Cross-origin request blocked.', 403);
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const { code, disable, setup } = await req.json().catch(() => ({})) as { code?: string; disable?: boolean; setup?: boolean };
  if (setup) {
    try {
      const result = await createTotpSetup();
      await audit(user, 'two_factor_setup_started', 'account');
      return NextResponse.json({ secret: result.secret, qr: await QRCode.toDataURL(result.uri), enabled: false }, { headers: { 'Cache-Control': 'no-store' } });
    } catch { return jsonError('Two-factor authentication is already enabled or setup failed.', 409); }
  }
  if (disable) {
    if (!code || !(await removeTotp(String(code)))) return jsonError('Enter a current authenticator code to disable two-factor authentication.');
    await audit(user, 'two_factor_disabled', 'account'); return NextResponse.json({ ok: true, enabled: false });
  }
  if (!code || !(await confirmTotp(String(code)))) return jsonError('That authenticator code is not valid.');
  await audit(user, 'two_factor_enabled', 'account');
  const setting = await ownerTotp();
  return NextResponse.json({ ok: true, enabled: setting?.enabled === true });
}
