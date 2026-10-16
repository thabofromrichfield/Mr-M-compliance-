import crypto from 'crypto';
import { localStore } from './store/local';
import { currentUserFromToken } from './auth';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
}

export function logAudit(token: string | undefined, action: string, resourceType: string, resourceId?: string, details?: string) {
  const user = token ? currentUserFromToken(token) : undefined;
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actor: user?.email || 'anonymous',
    action,
    resourceType,
    resourceId,
    details,
  };
  localStore.insert('auditLogs', entry);
  return entry;
}
