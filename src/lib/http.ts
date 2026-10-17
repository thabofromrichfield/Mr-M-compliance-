import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function jsonError(message: string, status = 400) { return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function safeError(error: unknown) {
  if (error instanceof Error && error.message.includes('required')) return error.message;
  return 'The request could not be completed. Please try again.';
}
export function text(value: unknown, max: number) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max); }
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0]!.trim().toLowerCase();
    return new URL(origin).host.toLowerCase() === host;
  } catch { return false; }
}
