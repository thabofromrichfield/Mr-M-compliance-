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
  try {
    const bytes = await readEncryptedFile(id);
    await audit(user, 'document_downloaded', 'document', id);
    return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': doc.mimeType, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`, 'Cache-Control': 'private, no-store' } });
  } catch { return jsonError('The document could not be decrypted or retrieved.', 503); }
}
