'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Result = { ok: boolean; name?: string; expiryDate?: string; error?: string };
export default function RenewalPage() {
  const [token, setToken] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    history.replaceState(null, '', window.location.pathname);
    setToken(value);
    if (!value) setResult({ ok: false, error: 'This renewal link is missing or invalid.' });
    setLoading(false);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !expiryDate) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/renew', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, expiryDate }), credentials: 'same-origin',
      });
      const data = await response.json();
      setResult(response.ok
        ? { ok: true, name: data.name, expiryDate: data.expiryDate }
        : { ok: false, error: data.error || 'This renewal link could not be used.' });
    } catch {
      setResult({ ok: false, error: 'The renewal service could not be reached. Please try again.' });
    } finally { setSubmitting(false); }
  }

  return <main className="renew-page"><section className="renew-card">
    <div className="login-brand"><span className="brand-symbol">C</span><div><b>ClearLedger</b><small>COMPLIANCE WORKSPACE</small></div></div>
    {loading ? <><div className="renew-icon spin">◌</div><h1>Opening renewal…</h1><p>Checking your secure renewal link.</p></>
      : result?.ok ? <><div className="renew-icon success">✓</div><div className="eyebrow">RENEWAL RECORDED</div><h1>{result.name} is updated.</h1><p>The new expiry date is <strong>{result.expiryDate && new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${result.expiryDate}T00:00:00`))}</strong>.</p><div className="renew-note">The actual date from the renewed document was recorded. ClearLedger does not assume a yearly renewal term.</div><Link href="/login" className="primary-btn">Return to ClearLedger</Link></>
      : token ? <><div className="eyebrow">SECURE RENEWAL LINK</div><h1>Enter the new expiry date</h1><p>No sign-in is needed. Use the date printed on the renewed certificate; the renewal period can vary by document.</p>{result?.error && <div className="notice error renew-error">{result.error}</div>}<form className="renew-form" onSubmit={submit}><label htmlFor="renew-expiry">New expiry date</label><input id="renew-expiry" className="field" type="date" value={expiryDate} onChange={event => setExpiryDate(event.target.value)} required/><button className="primary-btn" disabled={submitting || !expiryDate}>{submitting ? 'Recording renewal…' : 'Confirm new expiry date'}</button></form><div className="renew-note">This private link works once. It will update the record only after you confirm the actual new date.</div></>
      : <><div className="renew-icon failed">!</div><div className="eyebrow">LINK NOT AVAILABLE</div><h1>We couldn’t open this renewal.</h1><p>{result?.error}</p><Link href="/login" className="secondary-btn">Sign in to update expiry</Link></>}
  </section></main>;
}
