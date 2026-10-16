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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-lg mb-4">
            CA
          </div>
          <h1 className="text-3xl font-bold text-white">Compliance App</h1>
          <p className="text-slate-400 mt-2">Sign in to manage your documents</p>
        </div>

        <form onSubmit={submit} className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {needs2fa && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Two-factor code</label>
              <input
                className="w-full border border-slate-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition tracking-widest text-center"
                placeholder="000000"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
              />
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-100">
            Default demo account: <span className="font-mono">admin@compliance.app</span> / <span className="font-mono">Compliance123!</span>
          </div>
        </form>
      </div>
    </div>
  );
}
