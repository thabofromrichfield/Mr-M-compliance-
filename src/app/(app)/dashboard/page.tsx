'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/clientFetch';

type Doc = { id: string; name: string; category: string; tags?: string[]; expiryDate?: string | null; status: string; updatedAt?: string };
function daysRemaining(date?: string | null) { if (!date) return null; return Math.ceil((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86400000); }
function labelFor(doc: Doc) { if (doc.status === 'renewed') return { text: 'Renewed', cls: 'status-renewed' }; const n = daysRemaining(doc.expiryDate); if (n === null) return { text: 'No expiry set', cls: 'status-none' }; if (n < 0) return { text: 'Expired', cls: 'status-expired' }; if (n <= 7) return { text: n === 0 ? 'Due today' : `${n} day${n === 1 ? '' : 's'} left`, cls: 'status-urgent' }; if (n <= 30) return { text: `${n} days left`, cls: 'status-soon' }; return { text: 'On track', cls: 'status-safe' }; }
function displayDate(date?: string | null) { if (!date) return 'Not set'; return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)); }

export default function Dashboard() {
  const [docs, setDocs] = useState<Doc[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { let live = true; apiFetch('/api/documents', { cache: 'no-store' }).then((r) => r.json()).then((d) => { if (live) setDocs(d.documents || []); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, []);
  const attention = useMemo(() => docs.filter((d) => { const n = daysRemaining(d.expiryDate); return d.status !== 'renewed' && n !== null && n <= 30; }).sort((a, b) => (daysRemaining(a.expiryDate) ?? 9999) - (daysRemaining(b.expiryDate) ?? 9999)), [docs]);
  const expired = docs.filter((d) => d.status !== 'renewed' && (daysRemaining(d.expiryDate) ?? 1) < 0).length;
  const dueSoon = docs.filter((d) => d.status !== 'renewed' && (daysRemaining(d.expiryDate) ?? 9999) >= 0 && (daysRemaining(d.expiryDate) ?? 9999) <= 30).length;
  const safe = docs.filter((d) => d.status === 'renewed' || daysRemaining(d.expiryDate) === null || (daysRemaining(d.expiryDate) ?? 0) > 30).length;
  const urgent = docs.filter((d) => d.status !== 'renewed' && (daysRemaining(d.expiryDate) ?? 9999) <= 7).length;

  if (loading) return <div className="loading-state">Loading your compliance overview…</div>;
  return <>
    <div className="page-heading"><div><div className="eyebrow" style={{ marginBottom: 8 }}>YOUR COMPLIANCE AT A GLANCE</div><h1>Good to see you.</h1><p>Here’s what needs your attention and what’s safely in order.</p></div><div className="heading-actions"><Link className="button button-primary" href="/documents">＋ Add a document</Link></div></div>
    <section className="stat-grid" aria-label="Document summary">
      <Stat label="Documents tracked" value={docs.length} icon="▤" foot="Across your workspace" />
      <Stat label="Needs attention" value={dueSoon + expired} icon="⌁" foot="Due within 30 days or expired" tone={(dueSoon + expired) ? 'amber' : 'green'} />
      <Stat label="Urgent · 7 days" value={urgent} icon="◷" foot="Immediate action recommended" tone={urgent ? 'red' : 'green'} />
      <Stat label="On track" value={safe} icon="✓" foot="No action needed right now" tone="green" />
    </section>
    <section className="dashboard-grid">
      <div className="card">
        <div className="card-header"><div><h2 className="card-title">Priority documents</h2><p className="card-subtitle">The dates that need your attention first</p></div><Link href="/documents" style={{ color: 'var(--green)', fontWeight: 650, fontSize: 12 }}>View all →</Link></div>
        {docs.length === 0 ? <div className="empty-state"><div className="empty-icon">▤</div><strong>Your workspace starts here</strong><p>Add a compliance document to begin tracking important dates.</p><Link className="button button-primary" href="/documents" style={{ marginTop: 9 }}>Upload your first document</Link></div> : attention.length === 0 ? <div className="empty-state"><div className="empty-icon" style={{ color: '#39815c' }}>✓</div><strong>All clear for now</strong><p>No active documents expire in the next 30 days.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>DOCUMENT</th><th>CATEGORY</th><th>EXPIRY DATE</th><th>STATUS</th></tr></thead><tbody>{attention.slice(0, 7).map((doc) => <tr key={doc.id}><td><Link className="doc-title" href={`/documents/${doc.id}`}>{doc.name}</Link></td><td>{doc.category || 'Other'}</td><td>{displayDate(doc.expiryDate)}</td><td><span className={`status-pill ${labelFor(doc).cls}`}>{labelFor(doc).text}</span></td></tr>)}</tbody></table></div>}
      </div>
      <aside className="card">
        <div className="card-header"><div><h2 className="card-title">Expiry overview</h2><p className="card-subtitle">A clear view of your next deadlines</p></div></div>
        <div className="overview-list">
          <Overview label="Expired" count={expired} tone="red" hint="Past due" />
          <Overview label="Within 7 days" count={docs.filter((d) => d.status !== 'renewed' && (daysRemaining(d.expiryDate) ?? 9999) >= 0 && (daysRemaining(d.expiryDate) ?? 9999) <= 7).length} tone="red" hint="Act now" />
          <Overview label="Within 30 days" count={docs.filter((d) => d.status !== 'renewed' && (daysRemaining(d.expiryDate) ?? 9999) > 7 && (daysRemaining(d.expiryDate) ?? 9999) <= 30).length} tone="amber" hint="Plan renewal" />
          <Overview label="More than 30 days" count={docs.filter((d) => d.status !== 'renewed' && (daysRemaining(d.expiryDate) ?? 9999) > 30).length} tone="green" hint="On track" />
        </div>
        <div style={{ margin: '0 20px 20px', background: '#f5f8f5', borderRadius: 10, padding: 13, color: '#64776c', fontSize: 11 }}><strong style={{ color: '#2e5c45' }}>Smart reminders</strong><br/>Email reminders are scheduled 30, 7, and 1 day before expiry.</div>
      </aside>
    </section>
    <section className="card" style={{ marginTop: 18 }}><div className="card-header"><div><h2 className="card-title">Recently updated</h2><p className="card-subtitle">Your latest document activity</p></div><Link href="/audit" style={{ color: 'var(--green)', fontWeight: 650, fontSize: 12 }}>Activity log →</Link></div>{docs.length === 0 ? <div className="empty-state" style={{ padding: 24 }}>Your recent activity will appear here once you add documents.</div> : <div className="overview-list">{[...docs].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 3).map((d) => <Link className="overview-item" key={d.id} href={`/documents/${d.id}`}><span className="overview-dot green"/><span className="overview-copy"><span className="overview-name">{d.name}</span><span className="overview-date">{d.category || 'Other'} · Expires {displayDate(d.expiryDate)}</span></span><span className={`status-pill ${labelFor(d).cls}`}>{labelFor(d).text}</span></Link>)}</div>}</section>
  </>;
}

function Stat({ label, value, icon, foot, tone = '' }: { label: string; value: number; icon: string; foot: string; tone?: string }) { const color = tone === 'red' ? '#ae5145' : tone === 'amber' ? '#a97821' : tone === 'green' ? '#27704d' : 'var(--ink)'; return <article className="card stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-number" style={{ color }}>{value}</div><div className="stat-foot">{foot}</div></article>; }
function Overview({ label, count, tone, hint }: { label: string; count: number; tone: string; hint: string }) { return <div className="overview-item"><span className={`overview-dot ${tone}`}/><span className="overview-copy"><span className="overview-name">{label}</span><span className="overview-date">{hint}</span></span><span className="count-badge">{count}</span></div>; }
