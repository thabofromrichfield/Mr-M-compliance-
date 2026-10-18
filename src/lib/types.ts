export type RenewalStatus = 'active' | 'renewed' | 'expired';

export interface ComplianceDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  expiryDate: string | null;
  detectedExpiry: string | null;
  category: string;
  tags: string[];
  status: RenewalStatus;
  alertsSent: { d30: boolean; d7: boolean; d1: boolean };
  createdAt: string;
  updatedAt: string;
  hasFile?: boolean;
  demoMetadata?: Record<string, string>;
  renewedAt?: string;
  renewalTokenId?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}
