import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/auth';
import { saveRecord, listRecords } from '@/lib/data';
import { extractExpiryFromUpload } from '@/lib/expiry';
import { storeEncryptedFile } from '@/lib/files';
import { jsonError, sameOrigin, text } from '@/lib/http';
import type { ComplianceDocument } from '@/lib/types';

export const runtime = 'nodejs';
const MAX_BYTES = 4 * 1024 * 1024;
function publicDocument(doc: ComplianceDocument) { return doc; }

export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const documents = (await listRecords<ComplianceDocument>('documents')).sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'));
  await audit(user, 'documents_viewed', 'document_collection');
  return NextResponse.json({ documents: documents.map(publicDocument) }, { headers: { 'Cache-Control': 'no-store' } });
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
  const id = crypto.randomUUID();
  let detectedExpiry: string | null = null;
  try { detectedExpiry = await extractExpiryFromUpload(buffer, mimeType); }
  catch { detectedExpiry = null; }
  try { await storeEncryptedFile(id, buffer); }
  catch { return jsonError('Could not securely store the document. Check server storage configuration.', 503); }
  const now = new Date().toISOString();
  const doc: ComplianceDocument = {
    id, name: text(file.name, 160).replace(/[\\/]/g, '_').replace(/^\.+/, '') || `document.${ext || 'bin'}`, mimeType, size: file.size,
    expiryDate: null, detectedExpiry, category: text(form.get('category'), 50) || 'Other',
    tags: text(form.get('tags'), 240).split(',').map((tag) => text(tag, 32)).filter(Boolean).slice(0, 12),
    status: 'active', alertsSent: { d30: false, d7: false, d1: false }, createdAt: now, updatedAt: now,
  };
  await saveRecord('documents', doc);
  await audit(user, 'document_uploaded', 'document', id, `expiry detected: ${detectedExpiry ? 'yes' : 'no'}`);
  return NextResponse.json({ document: doc, confirmationRequired: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
