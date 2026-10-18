import { NextRequest, NextResponse } from 'next/server';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'node:stream';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/auth';
import { listRecords } from '@/lib/data';
import { readEncryptedFile } from '@/lib/files';
import { jsonError } from '@/lib/http';
import type { ComplianceDocument } from '@/lib/types';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const user = currentUser(req);
  if (!user) return jsonError('Sign in required.', 401);
  const docs = await listRecords<ComplianceDocument>('documents');
  await audit(user, 'backup_exported', 'archive');
  const output = new PassThrough();
  const parts: Buffer[] = [];
  output.on('data', (chunk: Buffer) => parts.push(Buffer.from(chunk)));
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('error', (error: Error) => output.destroy(error));
  archive.pipe(output);
  const finished = new Promise<void>((resolve, reject) => { output.on('end', resolve); output.on('error', reject); });
  for (const doc of docs) {
    if (doc.hasFile === false) continue;
    try { archive.append(await readEncryptedFile(doc.id), { name: `documents/${doc.name}` }); }
    catch { archive.append(`Document file could not be decrypted: ${doc.id}`, { name: `errors/${doc.id}.txt` }); }
  }
  archive.append(JSON.stringify({ exportedAt: new Date().toISOString(), documents: docs }, null, 2), { name: 'clearledger-manifest.json' });
  await archive.finalize();
  await finished;
  const zip = Buffer.concat(parts);
  return new NextResponse(new Uint8Array(zip), { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="clearledger-backup.zip"', 'Cache-Control': 'private, no-store' } });
}
