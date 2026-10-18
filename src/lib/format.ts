import type { ComplianceDocument } from './types';
export function daysUntil(expiryDate: string | null) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const date = new Date(`${expiryDate}T00:00:00`);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}
export function urgency(doc: ComplianceDocument) {
  const days = daysUntil(doc.expiryDate);
  if (doc.status === 'renewed') return { kind: 'unknown', label: 'Renewed', days };
  if (days === null) return { kind: 'unknown', label: 'Add expiry date', days };
  if (days < 0) return { kind: 'urgent', label: 'Expired', days };
  if (days <= 7) return { kind: 'urgent', label: days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`, days };
  if (days <= 30) return { kind: 'soon', label: `${days} days left`, days };
  return { kind: 'safe', label: 'On track', days };
}
export function formatDate(value: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${value}T00:00:00`));
}

export function formatCost(value?: number | null) {
  return value == null ? 'Not set' : new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
}
