import { NextResponse, NextRequest } from 'next/server';
import { localStore } from '@/lib/store/local';
import { CRON_SECRET, APP_BASE_URL, SESSION_SECRET, ALERT_RECIPIENTS } from '@/lib/config';
import { sendEmail, renewalEmailHtml } from '@/lib/email';
import { makeRenewToken } from '@/lib/renewToken';
import type { ComplianceDocument } from '@/lib/types';
import crypto from 'node:crypto';

function daysUntil(date: string) {
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.ceil((Date.parse(`${date}T00:00:00Z`) - today) / 86400000);
}
function matchesSecret(provided: string, expected: string) {
  const a = Buffer.from(provided); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const querySecret = process.env.NODE_ENV === 'production' ? '' : new URL(req.url).searchParams.get('secret') || '';
  if (process.env.NODE_ENV === 'production' && (!CRON_SECRET || SESSION_SECRET.length < 32 || !APP_BASE_URL || !process.env.SMTP_HOST || ALERT_RECIPIENTS.length === 0)) return NextResponse.json({ error: 'reminder service is not fully configured' }, { status: 503 });
  if (!CRON_SECRET && process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'cron is not configured' }, { status: 503 });
  if (CRON_SECRET && !matchesSecret(bearer || querySecret, CRON_SECRET)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const documents = localStore.list<ComplianceDocument>('documents');
  const sentResults: { id: string; name: string; daysLeft: number }[] = [];
  for (const doc of documents) {
    if (!doc.expiryDate || doc.status === 'renewed') continue;
    const daysLeft = daysUntil(doc.expiryDate);
    const alerts = { ...(doc.alertsSent || { d30: false, d7: false, d1: false }) };
    const renewUrl = `${APP_BASE_URL}/api/renew?token=${encodeURIComponent(makeRenewToken(doc.id))}`;
    let didSend = false;
    try {
      if (daysLeft <= 30 && daysLeft >= 28 && !alerts.d30) {
        await sendEmail([], `Reminder: ${doc.name} expires in about one month`, renewalEmailHtml(doc.name, doc.expiryDate, renewUrl));
        alerts.d30 = true; didSend = true;
      }
      if (daysLeft <= 7 && daysLeft >= 5 && !alerts.d7) {
        await sendEmail([], `Reminder: ${doc.name} expires in about one week`, renewalEmailHtml(doc.name, doc.expiryDate, renewUrl));
        alerts.d7 = true; didSend = true;
      }
      if (daysLeft <= 1 && daysLeft >= 0 && !alerts.d1) {
        await sendEmail([], `Urgent: ${doc.name} expires tomorrow`, renewalEmailHtml(doc.name, doc.expiryDate, renewUrl));
        alerts.d1 = true; didSend = true;
      }
    } catch (error) {
      console.error('Unable to send compliance reminder', { documentId: doc.id, error });
    }
    if (didSend) {
      localStore.update<ComplianceDocument>('documents', doc.id, { alertsSent: alerts, updatedAt: new Date().toISOString() });
      sentResults.push({ id: doc.id, name: doc.name, daysLeft });
    }
  }
  return NextResponse.json({ ok: true, sent: sentResults.length, results: sentResults }, { headers: { 'Cache-Control': 'no-store' } });
}
