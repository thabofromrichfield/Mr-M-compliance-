'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, clearPreviewSession } from '@/lib/clientFetch';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '◫' },
  { href: '/documents', label: 'Documents', icon: '▤' },
  { href: '/audit', label: 'Activity log', icon: '↻' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let live = true;
    apiFetch('/api/auth/me', { cache: 'no-store' }).then(async (res) => {
      if (!res.ok) { router.replace('/login'); return null; }
      return res.json();
    }).then((data) => {
      if (!live) return;
      if (data?.user) setUser(data.user);
      else router.replace('/login');
      setLoading(false);
    }).catch(() => { if (live) { setLoading(false); router.replace('/login'); } });
    return () => { live = false; };
  }, [router]);

  async function signOut() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    clearPreviewSession();
    router.replace('/login');
    router.refresh();
  }

  if (loading) return <div className="loading-state">Securing your workspace…</div>;
  if (!user) return null;
  const title = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? 'Workspace';

  return <div className="app-frame">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">C</div><div><div className="brand-title">ClearLedger</div><div className="brand-subtitle">Compliance workspace</div></div></div>
      <div className="nav-label">Workspace</div>
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`nav-link ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'active' : ''}`}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="storage-note"><strong>Private by design</strong>Your compliance files stay in your secure workspace.</div>
        <div className="profile-row"><div className="avatar" aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</div><div className="profile-email" title={user.email}>{user.email}</div><button className="logout" aria-label="Sign out" title="Sign out" onClick={signOut}>↪</button></div>
      </div>
    </aside>
    {menuOpen && <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9, background: 'rgba(13,31,26,.42)', border: 0 }} />}
    <section className="main-panel">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Open navigation">☰</button><Link href="/dashboard" className="mobile-brand"><span className="brand-mark" style={{ width: 29, height: 29, borderRadius: 9, fontSize: 15 }}>C</span>ClearLedger</Link><span className="eyebrow">{title}</span></div>
        <div className="topbar-date">{new Intl.DateTimeFormat('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</div>
      </header>
      <main className="content">{children}</main>
    </section>
  </div>;
}
