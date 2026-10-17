import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/auth';
import { deleteRecord, getRecord, saveRecord } from '@/lib/data';
import { removeEncryptedFile } from '@/lib/files';
import { jsonError, sameOrigin, text } from '@/lib/http';
import { nextAnnualExpiry } from '@/lib/renewal';
import type { ComplianceDocument } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, ctx: Ctx) {
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const { id } = await ctx.params;
  const doc = await getRecord<ComplianceDocument>('documents', id);
  if (!doc) return jsonError('Document not found.', 404);
  await audit(user, 'document_viewed', 'document', id);
  return NextResponse.json({ document: doc }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!sameOrigin(req)) return jsonError('Cross-origin request blocked.', 403);
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const { id } = await ctx.params;
  const doc = await getRecord<ComplianceDocument>('documents', id);
  if (!doc) return jsonError('Document not found.', 404);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (body.markRenewed === true) {
    if (!doc.expiryDate) return jsonError('Set an expiry date before marking this document renewed.');
    doc.expiryDate = nextAnnualExpiry(doc.expiryDate);
    doc.renewedAt = new Date().toISOString();
    doc.status = 'active';
    doc.alertsSent = { d30: false, d7: false, d1: false };
    doc.updatedAt = doc.renewedAt;
    await saveRecord('documents', doc);
    await audit(user, 'document_renewed', 'document', id, 'next annual expiry applied; edit if renewal term differs');
    return NextResponse.json({ document: doc });
  }
  if (body.expiryDate !== undefined) {
    const date = body.expiryDate === null || body.expiryDate === '' ? null : String(body.expiryDate);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError('Enter an expiry date in YYYY-MM-DD format.');
    doc.expiryDate = date;
  }
  if (body.category !== undefined) doc.category = text(body.category, 50) || 'Other';
  if (body.tags !== undefined) doc.tags = (Array.isArray(body.tags) ? body.tags : String(body.tags).split(',')).map((tag) => text(tag, 32)).filter(Boolean).slice(0, 12);
  if (body.expiryDate !== undefined) { doc.alertsSent = { d30: false, d7: false, d1: false }; doc.status = 'active'; }
  doc.updatedAt = new Date().toISOString();
  await saveRecord('documents', doc);
  await audit(user, 'document_updated', 'document', id, 'metadata updated');
  return NextResponse.json({ document: doc });
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  if (!sameOrigin(req)) return jsonError('Cross-origin request blocked.', 403);
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const { id } = await ctx.params;
  const doc = await getRecord<ComplianceDocument>('documents', id);
  if (!doc) return jsonError('Document not found.', 404);
  await removeEncryptedFile(id);
  await deleteRecord('documents', id);
  await audit(user, 'document_deleted', 'document', id);
  return NextResponse.json({ ok: true });
}
