import { NextRequest, NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { getRecord, saveRecord } from '@/lib/data';
import { isValidExpiryDate, verifyRenewalToken } from '@/lib/renewal';
import type { ComplianceDocument } from '@/lib/types';
import { jsonError } from '@/lib/http';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { token?: string; expiryDate?: unknown };
  const claims = verifyRenewalToken(String(body.token || ''));
  if (!claims) return jsonError('This renewal link is invalid or expired.', 401);
  if (!isValidExpiryDate(body.expiryDate)) return jsonError('Enter the actual new expiry date shown on the renewed document.');
  const doc = await getRecord<ComplianceDocument>('documents', claims.documentId);
  if (!doc || !doc.expiryDate) return jsonError('This document no longer has an active expiry date.', 404);
  if (doc.renewalTokenId === claims.tokenId || (doc.renewedAt && claims.issuedAt <= Date.parse(doc.renewedAt))) return jsonError('This renewal link has already been used or superseded.', 409);
  doc.expiryDate = body.expiryDate;
  doc.renewedAt = new Date().toISOString();
  doc.renewalTokenId = claims.tokenId;
  doc.status = 'active';
  doc.alertsSent = { d30: false, d7: false, d1: false };
  doc.updatedAt = doc.renewedAt;
  await saveRecord('documents', doc);
  await audit('signed-renewal-link', 'document_renewed', 'document', doc.id, `new expiry date recorded: ${doc.expiryDate}`);
  return NextResponse.json({ ok: true, name: doc.name, expiryDate: doc.expiryDate }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
