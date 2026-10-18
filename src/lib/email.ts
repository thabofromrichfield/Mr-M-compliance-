import 'server-only';
import nodemailer from 'nodemailer';
import { DEMO_MODE, ALERT_RECIPIENTS, APP_BASE_URL } from './config';
import { createRenewalToken } from './renewal';
import type { ComplianceDocument } from './types';

export async function sendExpiryAlert(doc: ComplianceDocument, days: 30 | 7 | 1) {
  if (DEMO_MODE) return; // Demo never sends external email.
  if (!ALERT_RECIPIENTS.length) throw new Error('No alert recipients are configured.');
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error('SMTP is not configured.');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  const token = createRenewalToken(doc.id);
  const link = `${APP_BASE_URL.replace(/\/$/, '')}/renew#token=${encodeURIComponent(token)}`;
  const expiry = doc.expiryDate ? new Date(`${doc.expiryDate}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'unknown';
  const subject = `${days === 1 ? 'Urgent: ' : ''}${doc.name} expires in ${days} day${days === 1 ? '' : 's'}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#172c27;max-width:600px;margin:auto;padding:28px"><p style="color:#527467;font-weight:bold;letter-spacing:.12em">CLEARLEDGER · COMPLIANCE ALERT</p><h1 style="font-size:24px">${escapeHtml(doc.name)} expires in ${days} day${days === 1 ? '' : 's'}</h1><p>Recorded expiry date: <strong>${expiry}</strong></p><p>Renew the document to keep your compliance records current.</p><p style="margin:28px 0"><a href="${link}" style="background:#176b50;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Enter new expiry date</a></p><p style="font-size:12px;color:#73827d">This private link works without signing in and can be used once. Enter the actual new expiry date shown on the renewed document; ClearLedger does not assume a yearly renewal term.</p></div>`;
  await transporter.sendMail({ from: process.env.SMTP_FROM, to: process.env.SMTP_FROM, bcc: ALERT_RECIPIENTS, subject, html, text: `${doc.name} expires on ${expiry}. Enter the new expiry date: ${link}` });
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)); }
