'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storePreviewSession } from '@/lib/clientFetch';
export default function LoginPage() {
  const router = useRouter(); const [email, setEmail] = useState('admin@compliance.app'); const [password, setPassword] = useState(''); const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, totp: totp || undefined }) });
      const result = await response.json();
      if (result.requires2fa) { setNeedsTotp(true); setBusy(false); return; }
      if (!response.ok) { setError(result.error || 'We could not sign you in. Check your details and try again.'); setBusy(false); return; }
      if (result.sessionToken) storePreviewSession(result.sessionToken);
      router.replace('/dashboard');
    } catch { setError('Could not reach the sign-in service. Try again in a moment.'); setBusy(false); }
  }
  return <main className="login-page">
    <section className="login-story"><div className="login-brand"><span className="brand-symbol">C</span><div><b>ClearLedger</b><small>PRIVATE COMPLIANCE WORKSPACE</small></div></div><div className="login-story-copy"><div className="eyebrow">STAY AHEAD OF EVERY DEADLINE</div><h1>Compliance,<br/>under control.</h1><p>One calm, secure place for your important documents, expiry dates, and the renewals that keep business moving.</p><div className="login-perks"><div><b>One private place</b><span>Your documents stay in your single-owner workspace</span></div><div><b>Clear dates</b><span>Know what needs attention before it is urgent</span></div><div><b>Quiet reminders</b><span>Get timely alerts to your approved recipients</span></div></div></div><div className="login-foot">Private by design · No registrations · No sharing</div></section>
    <section className="login-panel"><div className="login-box"><div className="eyebrow">WELCOME BACK</div><h2>Sign in to ClearLedger</h2><p>Use the owner account configured for this workspace.</p>{error && <div role="alert" className="notice error login-alert">{error}</div>}
      <form className="login-form" onSubmit={submit}><div><label htmlFor="email">Email address</label><input id="email" className="field" type="email" autoComplete="username" value={email} onChange={(e)=>setEmail(e.target.value)} required /></div><div><label htmlFor="password">Password</label><input id="password" className="field" type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} required /></div>{needsTotp && <div><label htmlFor="totp">Authenticator code</label><input id="totp" className="field" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={totp} onChange={(e)=>setTotp(e.target.value)} required autoFocus /></div>}<button className="primary-btn" disabled={busy}>{busy ? 'Signing you in…' : 'Sign in securely'} <span>→</span></button></form>
      {process.env.NODE_ENV !== 'production' && <div className="demo-note"><b>Local demo</b><br/>admin@compliance.app<br/>Compliance123!</div>}<div className="login-privacy">🔒 Your workspace is private. New account registration is disabled.</div><div className="login-small">Access is restricted to the configured owner.</div></div></section>
  </main>;
}
