import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore, uploadsDir } from '@/lib/store/local';
import type { ComplianceDocument } from '@/lib/types';
import { stripControlCharacters } from '@/lib/sanitize';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!currentUserFromToken(req.cookies.get('session')?.value)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = localStore.get<ComplianceDocument>('documents', id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const base = path.resolve(uploadsDir()); const target = path.resolve(doc.storagePath);
  if (!target.startsWith(`${base}${path.sep}`) || !fs.existsSync(target)) return NextResponse.json({ error: 'file not found' }, { status: 404 });
  const data = fs.readFileSync(target);
  const filename = encodeURIComponent(stripControlCharacters(doc.name));
  return new NextResponse(data, { headers: {
    'Content-Type': doc.mimeType === 'application/pdf' ? 'application/pdf' : 'application/octet-stream',
    'Content-Disposition': `inline; filename*=UTF-8''${filename}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  } });
}
