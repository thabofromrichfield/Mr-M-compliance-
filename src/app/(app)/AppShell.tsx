'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => {
      if (!r.ok) { router.replace('/login'); return null; }
      return r.json();
    }).then((d) => {
      if (d?.user) setUser(d.user);
      setLoading(false);
    }).catch(() => { router.replace('/login'); });
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-slate-900 text-white p-4 flex flex-col gap-2">
        <div className="text-lg font-bold mb-4">Compliance App</div>
        <Link href="/dashboard" className={nav(pathname, '/dashboard')}>Dashboard</Link>
        <Link href="/documents" className={nav(pathname, '/documents')}>Documents</Link>
        <Link href="/audit" className={nav(pathname, '/audit')}>Audit Log</Link>
        <Link href="/settings" className={nav(pathname, '/settings')}>Settings</Link>
        <div className="mt-auto text-xs text-slate-400">{user?.email}</div>
        <button onClick={logout} className="text-left text-sm text-slate-300 hover:text-white">Sign out</button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

function nav(pathname: string, href: string) {
  const active = pathname === href || pathname.startsWith(href + '/');
  return `px-3 py-2 rounded ${active ? 'bg-slate-700' : 'hover:bg-slate-800'}`;
}
