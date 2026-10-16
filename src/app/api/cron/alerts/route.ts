import { NextResponse, NextRequest } from 'next/server';
import { localStore } from '@/lib/store/local';
import { CRON_SECRET, APP_BASE_URL } from '@/lib/config';
import { sendEmail, renewalEmailHtml } from '@/lib/email';
import { makeRenewToken } from '@/lib/renewToken';

function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const docs = localStore.list<any>('documents');
  const results: any[] = [];
  for (const doc of docs) {
    if (!doc.expiryDate || doc.status === 'renewed') continue;
    const left = daysUntil(doc.expiryDate);
    const alerts = doc.alertsSent || { d30: false, d7: false, d1: false };
    const renewUrl = `${APP_BASE_URL}/api/renew?token=${makeRenewToken(doc.id)}`;
    let sent = false;
    if (left <= 30 && left >= 28 && !alerts.d30) {
      await sendEmail([], `Reminder: ${doc.name} expires in ~1 month`, renewalEmailHtml(doc.name, doc.expiryDate, renewUrl));
      alerts.d30 = true; sent = true;
    }
    if (left <= 7 && left >= 5 && !alerts.d7) {
      await sendEmail([], `Reminder: ${doc.name} expires in ~1 week`, renewalEmailHtml(doc.name, doc.expiryDate, renewUrl));
      alerts.d7 = true; sent = true;
    }
    if (left <= 1 && left >= 0 && !alerts.d1) {
      await sendEmail([], `Urgent: ${doc.name} expires tomorrow`, renewalEmailHtml(doc.name, doc.expiryDate, renewUrl));
      alerts.d1 = true; sent = true;
    }
    if (sent) {
      localStore.update('documents', doc.id, { alertsSent: alerts, updatedAt: new Date().toISOString() });
      results.push({ id: doc.id, name: doc.name, daysLeft: left });
    }
  }
  return NextResponse.json({ ok: true, sent: results.length, results });
}
