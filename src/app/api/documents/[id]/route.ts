import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore, uploadsDir } from '@/lib/store/local';
import { logAudit } from '@/lib/audit';
import type { ComplianceDocument } from '@/lib/types';
import { stripControlCharacters } from '@/lib/sanitize';
import fs from 'node:fs';
import path from 'node:path';

const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const publicDoc = (doc: ComplianceDocument): Omit<ComplianceDocument, 'storagePath'> => Object.fromEntries(Object.entries(doc).filter(([key]) => key !== 'storagePath')) as Omit<ComplianceDocument, 'storagePath'>;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!currentUserFromToken(req.cookies.get('session')?.value)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = localStore.get<ComplianceDocument>('documents', id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ document: publicDoc(doc) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('session')?.value;
  if (!currentUserFromToken(token)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = localStore.get<ComplianceDocument>('documents', id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: 'invalid request' }, { status: 400 }); }
  const patch: Partial<ComplianceDocument> = { updatedAt: new Date().toISOString() };

  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || body.category.trim().length > 60) return NextResponse.json({ error: 'invalid category' }, { status: 400 });
    patch.category = body.category.trim() || 'Other';
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 15 || body.tags.some((tag: unknown) => typeof tag !== 'string' || tag.length > 40)) return NextResponse.json({ error: 'invalid tags' }, { status: 400 });
    patch.tags = body.tags.map((tag) => stripControlCharacters(tag as string).trim()).filter(Boolean);
  }
  if (body.expiryDate !== undefined) {
    if (body.expiryDate !== null && !isDate(body.expiryDate)) return NextResponse.json({ error: 'expiryDate must be a valid YYYY-MM-DD date or null' }, { status: 400 });
    patch.expiryDate = body.expiryDate as string | null;
    patch.alertsSent = { d30: false, d7: false, d1: false };
    if (doc.status === 'renewed') patch.status = 'active';
  }
  if (body.renewed === true) {
    if (body.newExpiry !== undefined && body.newExpiry !== null && !isDate(body.newExpiry)) return NextResponse.json({ error: 'newExpiry must be a valid YYYY-MM-DD date' }, { status: 400 });
    patch.status = body.newExpiry ? 'active' : 'renewed';
    patch.renewedAt = new Date().toISOString();
    if (body.newExpiry) patch.expiryDate = body.newExpiry as string;
    patch.alertsSent = { d30: false, d7: false, d1: false };
  }
  const updated = localStore.update<ComplianceDocument>('documents', id, patch);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  logAudit(token, body.renewed === true ? 'renew' : 'update', 'document', id, body.renewed === true ? 'Renewal recorded' : 'Document details updated');
  return NextResponse.json({ document: publicDoc(updated) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('session')?.value;
  if (!currentUserFromToken(token)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = localStore.get<ComplianceDocument>('documents', id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const base = path.resolve(uploadsDir()); const target = path.resolve(doc.storagePath);
  if (target.startsWith(`${base}${path.sep}`) && fs.existsSync(target)) fs.unlinkSync(target);
  localStore.remove<ComplianceDocument>('documents', id);
  logAudit(token, 'delete', 'document', id, 'Document deleted');
  return NextResponse.json({ ok: true });
}
