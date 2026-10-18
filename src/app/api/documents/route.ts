import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/auth';
import { saveRecord, listRecords } from '@/lib/data';
import { extractDocumentFields } from '@/lib/expiry';
import { readEncryptedFile, storeEncryptedFile } from '@/lib/files';
import { jsonError, sameOrigin, text } from '@/lib/http';
import type { ComplianceDocument } from '@/lib/types';

export const runtime = 'nodejs';
const MAX_BYTES = 4 * 1024 * 1024;
type DuplicateMatch = {
  id: string;
  name: string;
  category: string;
  expiryDate: string | null;
  matchType: 'exact-file' | 'same-name-and-expiry' | 'same-name';
};
function normalizedName(value: string) {
  return value.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
async function findDuplicates(buffer: Buffer, name: string, detectedExpiry: string | null, documents: ComplianceDocument[]): Promise<DuplicateMatch[]> {
  const digest = crypto.createHash('sha256').update(buffer).digest('hex');
  const matches = new Map<string, DuplicateMatch>();
  const normalized = normalizedName(name);
  for (const doc of documents) {
    let matchType: DuplicateMatch['matchType'] | null = null;
    if (doc.size === buffer.length) {
      try {
        const stored = await readEncryptedFile(doc.id);
        if (stored.length === buffer.length && crypto.createHash('sha256').update(stored).digest('hex') === digest) matchType = 'exact-file';
      } catch { /* A missing legacy file cannot be compared; continue with metadata matching. */ }
    }
    if (!matchType && normalized && normalizedName(doc.name) === normalized) {
      matchType = detectedExpiry && doc.expiryDate === detectedExpiry ? 'same-name-and-expiry' : 'same-name';
    }
    if (matchType) matches.set(doc.id, { id: doc.id, name: doc.name, category: doc.category, expiryDate: doc.expiryDate, matchType });
  }
  return [...matches.values()].sort((a, b) => Number(b.matchType === 'exact-file') - Number(a.matchType === 'exact-file'));
}

export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const documents = (await listRecords<ComplianceDocument>('documents')).sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'));
  await audit(user, 'documents_viewed', 'document_collection');
  return NextResponse.json({ documents }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError('Cross-origin request blocked.', 403);
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const form = await req.formData().catch(() => null);
  if (!form) return jsonError('Choose a document to upload.');
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return jsonError('Choose a non-empty document.');
  if (file.size > MAX_BYTES) return jsonError('The maximum upload size is 4 MB in the web app.', 413);
  const ext = file.name.toLowerCase().split('.').pop();
  const mimeByExtension: Record<string, string> = {
    pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain', csv: 'text/csv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  };
  if (!ext || !mimeByExtension[ext]) return jsonError('Supported files are PDF, DOCX, TXT, CSV, PNG, JPG, and WEBP.');
  const mimeType = mimeByExtension[ext]!;
  const buffer = Buffer.from(await file.arrayBuffer());
  if (ext === 'pdf' && buffer.subarray(0, 5).toString() !== '%PDF-') return jsonError('This PDF appears to be invalid.');
  if (ext === 'docx' && buffer.subarray(0, 2).toString() !== 'PK') return jsonError('This DOCX document appears to be invalid.');
  if (ext === 'png' && buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return jsonError('This PNG image appears to be invalid.');
  if (['jpg', 'jpeg'].includes(ext) && buffer.subarray(0, 3).toString('hex') !== 'ffd8ff') return jsonError('This JPEG image appears to be invalid.');
  if (ext === 'webp' && (buffer.subarray(0, 4).toString() !== 'RIFF' || buffer.subarray(8, 12).toString() !== 'WEBP')) return jsonError('This WEBP image appears to be invalid.');

  let detectedExpiry: string | null = null;
  let detectedCost: number | null = null;
  try { const fields = await extractDocumentFields(buffer, mimeType); detectedExpiry = fields.expiryDate; detectedCost = fields.cost; }
  catch { detectedExpiry = null; }
  const name = text(file.name, 160).replace(/[\\/]/g, '_').replace(/^\.+/, '') || `document.${ext}`;
  const documents = await listRecords<ComplianceDocument>('documents');
  const duplicates = await findDuplicates(buffer, name, detectedExpiry, documents);
  if (duplicates.length && form.get('confirmDuplicate') !== 'true') {
    return NextResponse.json({
      error: 'A matching document is already in the library.',
      duplicateMatches: duplicates,
      detectedExpiry,
      confirmationRequired: true,
    }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }

  const id = crypto.randomUUID();
  try { await storeEncryptedFile(id, buffer); }
  catch { return jsonError('Could not securely store the document. Check server storage configuration.', 503); }
  const now = new Date().toISOString();
  const doc: ComplianceDocument = {
    id, name, mimeType, size: file.size,
    expiryDate: null, detectedExpiry, cost: null, detectedCost, category: text(form.get('category'), 50) || 'Other',
    tags: text(form.get('tags'), 240).split(',').map(tag => text(tag, 32)).filter(Boolean).slice(0, 12),
    status: 'active', alertsSent: { d30: false, d7: false, d1: false }, createdAt: now, updatedAt: now,
  };
  await saveRecord('documents', doc);
  if (duplicates.length) await audit(user, 'duplicate_document_added', 'document', id, `owner confirmed adding another copy; matches: ${duplicates.length}`);
  await audit(user, 'document_uploaded', 'document', id, `expiry detected: ${detectedExpiry ? 'yes' : 'no'}`);
  return NextResponse.json({ document: doc, confirmationRequired: true, duplicateConfirmed: duplicates.length > 0 }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
