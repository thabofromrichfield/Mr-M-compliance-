export interface ComplianceDocument {
  id: string;
  name: string;
  category: string;
  tags: string[];
  mimeType: string;
  size: number;
  storagePath: string;
  detectedExpiry: string | null;
  expiryDate: string | null;
  candidates: string[];
  status: 'active' | 'renewed';
  renewedAt?: string;
  alertsSent: { d30: boolean; d7: boolean; d1: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
}
