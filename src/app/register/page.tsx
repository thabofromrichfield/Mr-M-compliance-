'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Registration failed'); return; }
    const lr = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (lr.ok) router.replace('/dashboard'); else router.replace('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="bg-white p-8 rounded shadow w-96 space-y-4">
        <h1 className="text-2xl font-bold">Create account</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <p className="text-sm text-slate-500">Single-user app. Only the first registration is allowed.</p>
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full bg-slate-900 text-white p-2 rounded">{loading ? 'Creating…' : 'Register'}</button>
      </form>
    </div>
  );
}
