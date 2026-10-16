import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import { logAudit } from '@/lib/audit';
import { ZipArchive } from 'archiver';
import { Readable } from 'stream';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const docs = localStore.list<any>('documents');

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
  });

  for (const d of docs) {
    if (d.storagePath && require('fs').existsSync(d.storagePath)) {
      archive.file(d.storagePath, { name: d.name });
    }
  }
  archive.append(JSON.stringify(docs, null, 2), { name: 'manifest.json' });
  await archive.finalize();
  const buf = await done;

  logAudit(token, 'export', 'backup', undefined, `${docs.length} documents`);
  return new NextResponse(buf as any, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="compliance-backup.zip"',
    },
  });
}
