import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore, uploadsDir } from '@/lib/store/local';
import type { ComplianceDocument } from '@/lib/types';
import { stripControlCharacters } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';
import { ZipArchive } from 'archiver';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  if (!currentUserFromToken(token)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const docs = localStore.list<ComplianceDocument>('documents');
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => {
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
  });
  const root = path.resolve(uploadsDir());
  for (const doc of docs) {
    const file = path.resolve(doc.storagePath);
    if (file.startsWith(`${root}${path.sep}`) && fs.existsSync(file)) {
      const entryName = stripControlCharacters(path.basename(doc.name)).replace(/[\\/]/g, '_').slice(0, 180) || `${doc.id}.bin`;
      archive.file(file, { name: `documents/${entryName}` });
    }
  }
  const manifest = docs.map((doc) => Object.fromEntries(Object.entries(doc).filter(([key]) => key !== 'storagePath')));
  archive.append(JSON.stringify({ count: docs.length, documents: manifest }, null, 2), { name: 'manifest.json' });
  await archive.finalize();
  const zip = await complete;
  logAudit(token, 'export', 'backup', undefined, `${docs.length} document records`);
  return new NextResponse(new Uint8Array(zip), { headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="clearledger-backup.zip"',
    'Cache-Control': 'private, no-store',
  } });
}
