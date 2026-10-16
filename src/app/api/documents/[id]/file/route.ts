import { NextResponse, NextRequest } from 'next/server';
import { currentUserFromToken } from '@/lib/auth';
import { localStore } from '@/lib/store/local';
import fs from 'fs';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('session')?.value;
  const user = currentUserFromToken(token);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const doc = localStore.get<any>('documents', id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const buf = fs.readFileSync(doc.storagePath);
  return new NextResponse(buf, {
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${doc.name}"`,
    },
  });
}
