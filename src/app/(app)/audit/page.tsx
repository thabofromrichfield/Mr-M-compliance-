'use client';
import { useEffect, useState } from 'react';

type Entry = { id: string; timestamp: string; actor: string; action: string; resourceType: string; resourceId?: string; details?: string };
const actionNames: Record<string, string> = { login: 'Signed in', logout: 'Signed out', upload: 'Uploaded document', update: 'Updated document', delete: 'Deleted document', renew: 'Marked document as renewed', export: 'Exported backup', totp_enable: 'Enabled two-factor authentication', renew_one_click: 'Confirmed renewal from email' };
export default function AuditPage() {
 const [logs, setLogs] = useState<Entry[]>([]); const [loading, setLoading] = useState(true);
 useEffect(() => { fetch('/api/audit', { cache: 'no-store' }).then((r) => r.json()).then((d) => setLogs(d.logs || [])).finally(() => setLoading(false)); }, []);
 return <>
  <div className="page-heading"><div><div className="eyebrow" style={{ marginBottom: 8 }}>TRANSPARENCY & OVERSIGHT</div><h1>Activity log</h1><p>A private record of important actions in your workspace.</p></div></div>
  <section className="card"><div className="card-header"><div><h2 className="card-title">Recent activity</h2><p className="card-subtitle">{logs.length} recorded {logs.length === 1 ? 'event' : 'events'}</p></div></div>{loading ? <div className="loading-state">Loading activity…</div> : logs.length === 0 ? <div className="empty-state"><div className="empty-icon">↻</div><strong>No activity recorded yet</strong><p>Sign-ins and document updates will appear here.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>WHEN</th><th>EVENT</th><th>RESOURCE</th><th>DETAILS</th></tr></thead><tbody>{logs.map((entry) => <tr key={entry.id}><td style={{ whiteSpace: 'nowrap' }}>{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.timestamp))}</td><td><span className="overview-dot green" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}/><strong>{actionNames[entry.action] || entry.action}</strong></td><td>{entry.resourceType}{entry.resourceId ? ` · ${entry.resourceId.slice(0, 8)}` : ''}</td><td>{entry.details || '—'}</td></tr>)}</tbody></table></div>}</section>
 </>;
}
