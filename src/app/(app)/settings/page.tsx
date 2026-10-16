'use client';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  async function setup2fa() {
    const r = await fetch('/api/auth/totp/setup', { method: 'POST' });
    const d = await r.json();
    setQr(d.qr); setSecret(d.secret);
  }
  async function verify2fa() {
    const r = await fetch('/api/auth/totp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    if (r.ok) { setMsg('2FA enabled'); setQr(''); } else setMsg(d.error || 'Failed');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Two-factor authentication</h2>
        <p className="text-sm text-slate-500">Status: {user?.totpEnabled ? 'Enabled' : 'Disabled'}</p>
        {!qr && <button onClick={setup2fa} className="bg-slate-900 text-white px-4 py-2 rounded">Set up 2FA</button>}
        {qr && (
          <div className="space-y-3">
            <img src={qr} alt="QR code" className="w-48 h-48" />
            <p className="text-xs break-all">Secret: {secret}</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" className="border p-2 rounded w-full" />
            <button onClick={verify2fa} className="bg-blue-600 text-white px-4 py-2 rounded">Verify & enable</button>
          </div>
        )}
        {msg && <div className="text-sm">{msg}</div>}
      </div>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Backup / Export</h2>
        <p className="text-sm text-slate-500">Download a zip of all stored documents.</p>
        <a href="/api/export" className="bg-slate-900 text-white px-4 py-2 rounded inline-block">Download backup</a>
      </div>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Email alerts</h2>
        <p className="text-sm text-slate-500">Recipients are fixed via ALERT_RECIPIENTS env config. Trigger a check manually:</p>
        <button onClick={async () => {
          const r = await fetch(`/api/cron/alerts?secret=${encodeURIComponent(process.env.NEXT_PUBLIC_CRON_SECRET || '')}`);
          // fallback: prompt
          alert('Use /api/cron/alerts?secret=CRON_SECRET');
        }} className="bg-slate-900 text-white px-4 py-2 rounded">Info</button>
        <p className="text-xs text-slate-400">Run: GET /api/cron/alerts?secret=YOUR_CRON_SECRET</p>
      </div>
    </div>
  );
}
