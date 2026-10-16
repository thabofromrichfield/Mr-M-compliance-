'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp: totp || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.requires2fa) { setNeeds2fa(true); return; }
    if (!res.ok) { setError(data.error || 'Login failed'); return; }
    router.replace('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-8 rounded shadow w-96 space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {needs2fa && (
          <input className="w-full border p-2 rounded" placeholder="2FA code" value={totp} onChange={(e) => setTotp(e.target.value)} />
        )}
        <button disabled={loading} className="w-full bg-slate-900 text-white p-2 rounded">{loading ? 'Signing in…' : 'Sign in'}</button>
        <div className="text-sm text-center">
          No account? <a href="/register" className="text-blue-600">Register</a>
        </div>
      </form>
    </div>
  );
}
