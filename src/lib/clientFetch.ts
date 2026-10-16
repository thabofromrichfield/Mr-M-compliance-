'use client';

const SESSION_STORAGE_KEY = 'clearledger-session';

function readPreviewSession(): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(SESSION_STORAGE_KEY); } catch { /* storage may be disabled in a restricted iframe */ }
  try { return window.localStorage.getItem(SESSION_STORAGE_KEY); } catch { return null; }
}

export function storePreviewSession(token: string) {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(SESSION_STORAGE_KEY, token); return; } catch { /* fall back for restricted iframe sessions */ }
  try { window.localStorage.setItem(SESSION_STORAGE_KEY, token); } catch { /* API cookie remains the fallback */ }
}

export function clearPreviewSession() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore unavailable storage */ }
  try { window.localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore unavailable storage */ }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = readPreviewSession();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}

export async function downloadFromApi(url: string, filename: string) {
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
