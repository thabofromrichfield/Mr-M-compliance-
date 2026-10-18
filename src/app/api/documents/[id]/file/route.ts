import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/auth';
import { getRecord } from '@/lib/data';
import { readEncryptedFile } from '@/lib/files';
import { jsonError } from '@/lib/http';
import type { ComplianceDocument } from '@/lib/types';
export const runtime = 'nodejs';
type Ctx = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, ctx: Ctx) {
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const { id } = await ctx.params;
  const doc = await getRecord<ComplianceDocument>('documents', id);
  if (!doc) return jsonError('Document not found.', 404);
  if (doc.hasFile === false) return jsonError('This demo record has no attached certificate. Only metadata was supplied.', 404);
  try {
    const bytes = await readEncryptedFile(id);
    const preview = req.nextUrl.searchParams.get('preview') === '1';
    await audit(user, preview ? 'document_previewed' : 'document_downloaded', 'document', id);
    return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': doc.mimeType, 'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.name)}`, 'Cache-Control': 'private, no-store' } });
  } catch { return jsonError('The document could not be decrypted or retrieved.', 503); }
}
