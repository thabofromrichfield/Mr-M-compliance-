import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore } from '@/lib/store/local';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const logs = localStore.list<any>('auditLogs').sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return NextResponse.json({ logs });
}
