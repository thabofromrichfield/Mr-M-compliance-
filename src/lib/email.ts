import nodemailer from 'nodemailer';
import { ALERT_RECIPIENTS } from './config';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);

export async function sendEmail(_requestedRecipients: string[], subject: string, html: string) {
  // The recipient list is deliberately sourced only from server configuration.
  const recipients = ALERT_RECIPIENTS;
  if (!recipients.length) {
    console.info('[email] no fixed recipients configured; reminder not delivered:', subject);
    return { ok: true, logged: true };
  }
  if (!process.env.SMTP_HOST) {
    console.info('[email] SMTP not configured; reminder not delivered to:', recipients.length, 'fixed recipient(s)');
    return { ok: true, logged: true };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM || 'ClearLedger <no-reply@example.com>', to: recipients.join(','), subject, html });
  return { ok: true };
}

export function renewalEmailHtml(docName: string, expiry: string, renewUrl: string) {
  const safeName = escapeHtml(docName);
  const safeExpiry = escapeHtml(expiry);
  const safeUrl = escapeHtml(renewUrl);
  return `<div style="font-family:Arial,sans-serif;color:#17352e"><h2>Compliance reminder</h2><p><strong>${safeName}</strong> expires on ${safeExpiry}.</p><p><a href="${safeUrl}" style="background:#176b52;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Mark as renewed</a></p><p>If you have already renewed the document, use this link to update its status.</p></div>`;
}
