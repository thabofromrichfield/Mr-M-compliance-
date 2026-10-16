import nodemailer from 'nodemailer';
import { ALERT_RECIPIENTS, APP_BASE_URL } from './config';

export async function sendEmail(to: string[], subject: string, html: string) {
  const recipients = to.length ? to : ALERT_RECIPIENTS;
  if (!recipients.length) {
    console.log('[email] no recipients configured; logging instead:\n', subject, '\n', html.replace(/<[^>]+>/g, ''));
    return { ok: true, logged: true };
  }
  if (!process.env.SMTP_HOST) {
    console.log('[email] SMTP not configured; logging email to', recipients, '\n', subject);
    return { ok: true, logged: true };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Compliance App <no-reply@example.com>',
    to: recipients.join(','),
    subject,
    html,
  });
  return { ok: true };
}

export function renewalEmailHtml(docName: string, expiry: string, renewUrl: string) {
  return `
    <div style="font-family:sans-serif">
      <h2>Document expiring soon</h2>
      <p><strong>${docName}</strong> expires on ${expiry}.</p>
      <p><a href="${renewUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Mark as renewed</a></p>
      <p>If you have already renewed, click the button to reset tracking.</p>
    </div>
  `;
}
