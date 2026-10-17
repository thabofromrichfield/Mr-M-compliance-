import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { sendExpiryAlert } from '@/lib/email';
import { CRON_SECRET } from '@/lib/config';
import { listRecords, saveRecord } from '@/lib/data';
import type { ComplianceDocument } from '@/lib/types';

export async function GET(req: NextRequest) {
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  if (!CRON_SECRET || supplied !== CRON_SECRET) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const docs = await listRecords<ComplianceDocument>('documents');
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  let sent = 0; const errors: string[] = [];
  for (const doc of docs) {
    if (!doc.expiryDate || doc.status === 'renewed') continue;
    const expiry = new Date(`${doc.expiryDate}T00:00:00Z`);
    const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
    const stage = days >= 0 && days <= 1 ? 1 : days > 1 && days <= 7 ? 7 : days > 7 && days <= 30 ? 30 : null;
    if (!stage || doc.alertsSent[`d${stage}` as 'd30' | 'd7' | 'd1']) continue;
    try {
      await sendExpiryAlert(doc, stage);
      doc.alertsSent[`d${stage}` as 'd30' | 'd7' | 'd1'] = true;
      doc.updatedAt = new Date().toISOString();
      await saveRecord('documents', doc);
      await audit('scheduler', `expiry_alert_${stage}d`, 'document', doc.id, `sent to fixed allowlist (${process.env.ALERT_RECIPIENTS?.split(',').filter(Boolean).length || 0} configured)`);
      sent++;
    } catch (error) { errors.push(`${doc.id}:${error instanceof Error ? error.message : 'send failed'}`); }
  }
  return NextResponse.json({ sent, errors }, { status: errors.length ? 207 : 200 });
}
