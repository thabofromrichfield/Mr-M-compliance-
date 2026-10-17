import { NextRequest, NextResponse } from 'next/server';
import { audit, auditTrail } from '@/lib/audit';
import { currentUser } from '@/lib/auth';
import { jsonError } from '@/lib/http';
export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  await audit(user, 'audit_log_viewed', 'audit');
  return NextResponse.json({ logs: await auditTrail() }, { headers: { 'Cache-Control': 'no-store' } });
}
