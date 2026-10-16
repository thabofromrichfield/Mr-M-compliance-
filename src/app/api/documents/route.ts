import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore, uploadsDir } from '@/lib/store/local';
import { logAudit } from '@/lib/audit';
import { extractTextFromFile, extractDates } from '@/lib/expiry';
import type { ComplianceDocument } from '@/lib/types';
import { stripControlCharacters } from '@/lib/sanitize';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.csv']);
function publicDoc(doc: ComplianceDocument): Omit<ComplianceDocument, 'storagePath'> {
  return Object.fromEntries(Object.entries(doc).filter(([key]) => key !== 'storagePath')) as Omit<ComplianceDocument, 'storagePath'>;
}

export async function GET(req: NextRequest) {
  if (!currentUserFromToken(req.cookies.get('session')?.value)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const docs = localStore.list<ComplianceDocument>('documents').map(publicDoc);
  return NextResponse.json({ documents: docs }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  if (!currentUserFromToken(token)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Invalid upload form.' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return NextResponse.json({ error: 'Only PDF, TXT, and CSV files are supported.' }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'The file is too large. Maximum size is 10 MB.' }, { status: 413 });
  const mimeType = extension === '.pdf' ? 'application/pdf' : extension === '.csv' ? 'text/csv' : 'text/plain';
  const name = stripControlCharacters(file.name).replace(/[\\/]/g, '_').trim().slice(0, 180) || `document${extension}`;
  const category = String(form.get('category') || 'Other').trim().slice(0, 60) || 'Other';
  const tags = String(form.get('tags') || '').split(',').map((tag) => stripControlCharacters(tag).trim().slice(0, 40)).filter(Boolean).slice(0, 15);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (extension === '.pdf' && buffer.subarray(0, 5).toString() !== '%PDF-') return NextResponse.json({ error: 'This file does not appear to be a valid PDF.' }, { status: 415 });

  const id = crypto.randomUUID();
  const storagePath = path.join(uploadsDir(), `${id}${extension}`);
  try { fs.writeFileSync(storagePath, buffer, { flag: 'wx', mode: 0o600 }); }
  catch { return NextResponse.json({ error: 'Could not store the uploaded document.' }, { status: 500 }); }
  let candidates: string[] = [];
  try { candidates = extractDates(await extractTextFromFile(buffer, mimeType, name)); } catch { candidates = []; }
  const now = new Date().toISOString();
  const doc: ComplianceDocument = {
    id, name, category, tags, mimeType, size: file.size, storagePath,
    detectedExpiry: candidates.length ? candidates[candidates.length - 1] : null,
    expiryDate: candidates.length ? candidates[candidates.length - 1] : null,
    candidates, status: 'active', alertsSent: { d30: false, d7: false, d1: false }, createdAt: now, updatedAt: now,
  };
  localStore.insert<ComplianceDocument>('documents', doc);
  logAudit(token, 'upload', 'document', id, name);
  return NextResponse.json({ document: publicDoc(doc), candidates }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
