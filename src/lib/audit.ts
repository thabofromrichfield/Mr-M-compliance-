import crypto from 'node:crypto';
import { listRecords, saveRecord } from './data';
import type { AuditEntry } from './types';

export async function audit(actor: string, action: string, resource: string, resourceId?: string, details?: string) {
  const entry: AuditEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor, action, resource, resourceId, details };
  await saveRecord('audit', entry);
  return entry;
}
export async function auditTrail(): Promise<AuditEntry[]> {
  return (await listRecords<AuditEntry>('audit')).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
