import { NextResponse, NextRequest } from 'next/server';
import { localStore } from '@/lib/store/local';
import { parseRenewToken } from '@/lib/renewToken';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tok = url.searchParams.get('token') || '';
  const docId = parseRenewToken(tok);
  if (!docId) return new NextResponse('Invalid or expired link.', { status: 400 });
  const doc = localStore.get<any>('documents', docId);
  if (!doc) return new NextResponse('Document not found.', { status: 404 });
  localStore.update('documents', docId, {
    status: 'renewed',
    renewedAt: new Date().toISOString(),
    alertsSent: { d30: false, d7: false, d1: false },
    updatedAt: new Date().toISOString(),
  });
  logAudit(undefined, 'renew_one_click', 'document', docId, doc.name);
  return new NextResponse(
    `<!doctype html><html><body style="font-family:sans-serif;padding:40px">
      <h2>Renewal confirmed</h2>
      <p>${doc.name} has been marked as renewed. You can close this page.</p>
      <p><a href="/">Open app</a></p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
