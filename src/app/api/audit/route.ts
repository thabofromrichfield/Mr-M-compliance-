import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import type { AuditEntry } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!currentUserFromToken(req.cookies.get('session')?.value)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const logs = localStore.list<AuditEntry>('auditLogs').sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return NextResponse.json({ logs }, { headers: { 'Cache-Control': 'no-store' } });
}
