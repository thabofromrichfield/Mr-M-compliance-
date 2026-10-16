import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = localStore.get<any>('documents', id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const patch: any = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.category !== undefined) patch.category = body.category;
  if (body.tags !== undefined) patch.tags = body.tags;
  if (body.expiryDate !== undefined) {
    patch.expiryDate = body.expiryDate;
    patch.alertsSent = { d30: false, d7: false, d1: false };
  }
  if (body.status !== undefined) patch.status = body.status;
  if (body.renewed === true) {
    patch.status = 'renewed';
    patch.renewedAt = new Date().toISOString();
    if (body.newExpiry) {
      patch.expiryDate = body.newExpiry;
      patch.status = 'active';
    }
    patch.alertsSent = { d30: false, d7: false, d1: false };
  }
  const updated = localStore.update('documents', id, patch);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  logAudit(token, 'update', 'document', id, JSON.stringify(body));
  return NextResponse.json({ document: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = localStore.get<any>('documents', id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  try { if (doc.storagePath && require('fs').existsSync(doc.storagePath)) require('fs').unlinkSync(doc.storagePath); } catch {}
  localStore.remove('documents', id);
  logAudit(token, 'delete', 'document', id, doc.name);
  return NextResponse.json({ ok: true });
}
