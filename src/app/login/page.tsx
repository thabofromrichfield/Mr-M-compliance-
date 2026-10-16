'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@compliance.app');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, totp: totp || undefined }) });
      const result = await response.json();
      if (result.requires2fa) { setNeeds2fa(true); setBusy(false); return; }
      if (!response.ok) { setError(result.error || 'Sign-in failed. Check your details and try again.'); setBusy(false); return; }
      // A full navigation ensures the just-issued HTTP-only session cookie is included on the first protected-page request.
      window.location.replace('/dashboard');
    } catch { setError('Could not reach the sign-in service. Please try again.'); setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-story" aria-label="ClearLedger introduction">
      <div className="login-wordmark"><div className="brand-mark">C</div><div><strong>ClearLedger</strong><small>Compliance workspace</small></div></div>
      <div className="login-story-content">
        <div className="eyebrow" style={{ color: '#9ec7ae' }}>STAY AHEAD OF EVERY DEADLINE</div>
        <h1>Compliance,<br/>under control.</h1>
        <p>One clear view of your documents, key dates, and upcoming renewals—so the important things never slip through.</p>
        <div className="login-mini"><div><strong>One place</strong><span>Keep important files close</span></div><div><strong>Clear dates</strong><span>Know what needs attention</span></div><div><strong>Quiet reminders</strong><span>Act before deadlines</span></div></div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, color: '#91a99d', fontSize: 11 }}>Private single-owner workspace · Secure sign-in</div>
    </section>
    <section className="login-form-side">
      <div className="login-form-wrap">
        <div className="eyebrow" style={{ marginBottom: 12 }}>WELCOME BACK</div>
        <h2>Sign in to your account</h2>
        <p>Enter your account details to continue to your workspace.</p>
        {error && <div role="alert" className="notice notice-error" style={{ marginBottom: 17 }}>{error}</div>}
        <form className="login-form" onSubmit={submit}>
          <div><label className="field-label" htmlFor="email">Email address</label><input id="email" className="field" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="field-label" htmlFor="password">Password</label><input id="password" className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {needs2fa && <div><label className="field-label" htmlFor="totp">Two-factor authentication code</label><input id="totp" className="field" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="Enter your code" value={totp} onChange={(e) => setTotp(e.target.value)} required /></div>}
          <button className="button button-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'} <span aria-hidden="true">→</span></button>
        </form>
        {process.env.NODE_ENV !== 'production' && <div className="demo-note" style={{ marginTop: 20 }}><strong>Demo access</strong><br/>Email: <code>admin@compliance.app</code><br/>Password: <code>Compliance123!</code></div>}
        <p style={{ fontSize: 11, textAlign: 'center', marginTop: 22, color: '#8a9791' }}>Access is invite-only. New account registration is disabled.</p>
      </div>
    </section>
  </main>;
}
