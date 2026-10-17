'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, clearPreviewSession } from '@/lib/clientFetch';

const links = [
  { href: '/dashboard', label: 'Overview', icon: '◫' },
  { href: '/documents', label: 'Documents', icon: '▤' },
  { href: '/audit', label: 'Audit log', icon: '◷' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [email, setEmail] = useState('Owner'); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    apiFetch('/api/auth/me').then(async (res) => {
      if (!res.ok) { router.replace('/login'); return; }
      const data = await res.json(); if (active) setEmail(data.user?.email || 'Owner');
    }).catch(() => router.replace('/login')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [router]);
  async function signOut() { await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined); clearPreviewSession(); router.replace('/login'); }
  if (loading) return <div className="boot-screen"><span className="brand-symbol">C</span><span>Opening your private workspace…</span></div>;
  return <div className="workspace">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand-lockup"><span className="brand-symbol">C</span><span><b>ClearLedger</b><small>COMPLIANCE WORKSPACE</small></span></Link>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav">{links.map((link) => <Link key={link.href} href={link.href} className={path === link.href ? 'nav-link active' : 'nav-link'}><span className="nav-icon">{link.icon}</span>{link.label}{link.href === '/documents' && <span className="nav-arrow">›</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><span className="privacy-dot"/><div><b>Private by design</b><small>Single-owner access</small></div></div><button className="profile-button" onClick={signOut}><span className="avatar">{email.slice(0,1).toUpperCase()}</span><span className="profile-copy"><b>{email}</b><small>Sign out</small></span><span className="profile-menu">↗</span></button></div>
    </aside>
    <div className="main-column"><header className="topbar"><div className="breadcrumbs"><span>Workspace</span><i>/</i><b>{links.find((link) => link.href === path)?.label || 'Documents'}</b></div><div className="topbar-right"><span className="secure-pill"><span>●</span> Encrypted workspace</span><span className="today-label">TODAY <b>{new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'short',year:'numeric'}).format(new Date())}</b></span></div></header><main className="page-main">{children}</main><footer className="page-footer"><span>ClearLedger · Your compliance, in clear view</span><span><span className="footer-lock">▣</span> Private single-owner workspace</span></footer></div>
  </div>;
}
