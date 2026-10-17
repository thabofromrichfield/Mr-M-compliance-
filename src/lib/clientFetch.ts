'use client';
const KEY = 'clearledger-preview-session';
function token() {
  if (typeof window === 'undefined') return '';
  try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function storePreviewSession(value: string) {
  try { sessionStorage.setItem(KEY, value); } catch { try { localStorage.setItem(KEY, value); } catch {} }
}
export function clearPreviewSession() {
  try { sessionStorage.removeItem(KEY); } catch {}
  try { localStorage.removeItem(KEY); } catch {}
}
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers); const value = token();
  if (value) { headers.set('Authorization', `Bearer ${value}`); headers.set('X-ClearLedger-Session', value); }
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}
export async function downloadApi(url: string) {
  const response = await apiFetch(url); if (!response.ok) throw new Error('Download failed.');
  const objectUrl = URL.createObjectURL(await response.blob()); const a = document.createElement('a');
  a.href = objectUrl; a.download = 'clearledger-backup.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(objectUrl);
}
