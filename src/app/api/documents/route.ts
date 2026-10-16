import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import { logAudit } from '@/lib/audit';
import { extractTextFromFile, extractDates } from '@/lib/expiry';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { uploadsDir } from '@/lib/store/local';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const docs = localStore.list<any>('documents');
  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
  const category = String(form.get('category') || 'uncategorised');
  const tags = String(form.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const manualExpiry = String(form.get('expiryDate') || '').trim();

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = path.join(uploadsDir(), `${id}_${safeName}`);
  fs.writeFileSync(storagePath, buffer);

  const text = await extractTextFromFile(buffer, file.type, file.name);
  const candidates = extractDates(text);

  const doc = {
    id,
    name: file.name,
    category,
    tags,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    storagePath,
    detectedExpiry: candidates.length ? candidates[candidates.length - 1] : null,
    expiryDate: manualExpiry || (candidates.length ? candidates[candidates.length - 1] : null),
    candidates,
    status: 'active',
    alertsSent: { d30: false, d7: false, d1: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStore.insert('documents', doc);
  logAudit(token, 'upload', 'document', id, file.name);
  return NextResponse.json({ document: doc, candidates });
}
