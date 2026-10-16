import { NextResponse, NextRequest } from 'next/server';
import { localStore } from '@/lib/store/local';
import type { ComplianceDocument } from '@/lib/types';
import { parseRenewToken } from '@/lib/renewToken';
import { logAudit } from '@/lib/audit';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') || '';
  const documentId = parseRenewToken(token);
  if (!documentId) return new NextResponse('This renewal link is invalid or has expired.', { status: 400 });
  const doc = localStore.get<ComplianceDocument>('documents', documentId);
  if (!doc) return new NextResponse('Document not found.', { status: 404 });
  if (doc.status !== 'renewed') {
    localStore.update<ComplianceDocument>('documents', documentId, {
      status: 'renewed', renewedAt: new Date().toISOString(),
      alertsSent: { d30: false, d7: false, d1: false }, updatedAt: new Date().toISOString(),
    });
    logAudit(undefined, 'renew_one_click', 'document', documentId, 'Renewal confirmed by email link');
  }
  const name = escapeHtml(doc.name);
  return new NextResponse(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renewal recorded · ClearLedger</title><body style="font-family:system-ui;background:#f5f7f3;color:#17352e;min-height:100vh;display:grid;place-items:center;margin:0"><main style="background:white;border:1px solid #e5ebe5;border-radius:16px;padding:34px;max-width:480px;margin:20px;box-shadow:0 16px 48px #1a322b12"><div style="font-size:30px;color:#176b52">✓</div><h1 style="font-size:24px;margin:14px 0 8px">Renewal recorded</h1><p><strong>${name}</strong> has been marked as renewed. You can close this page.</p></main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
