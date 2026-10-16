'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, downloadFromApi } from '@/lib/clientFetch';

type Doc = { id: string; name: string; category: string; tags?: string[]; mimeType?: string; size?: number; expiryDate?: string | null; status: string; createdAt: string; updatedAt: string; detectedExpiry?: string | null };
function dateLabel(value?: string | null) { if (!value) return 'Not set'; return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }
export default function DocumentDetail() {
 const { id } = useParams<{ id: string }>(); const router = useRouter(); const [doc, setDoc] = useState<Doc | null>(null); const [expiry, setExpiry] = useState(''); const [category, setCategory] = useState('Other'); const [tags, setTags] = useState(''); const [newExpiry, setNewExpiry] = useState(''); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
 const load = useCallback(async () => { const res = await apiFetch(`/api/documents/${id}`, { cache: 'no-store' }); if (!res.ok) { router.replace('/documents'); return; } const data = await res.json(); const d = data.document as Doc; setDoc(d); setExpiry(d.expiryDate || ''); setCategory(d.category || 'Other'); setTags((d.tags || []).join(', ')); }, [id, router]);
 useEffect(() => {
  // This effect starts an async server fetch; state is updated only after its response resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  void load();
 }, [load]);
 async function save() { setSaving(true); const res = await apiFetch(`/api/documents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiryDate: expiry || null, category, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }) }); setSaving(false); if (res.ok) { setMessage('Changes saved.'); await load(); } else setMessage('Unable to save changes.'); }
 async function renew() { setSaving(true); const res = await apiFetch(`/api/documents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ renewed: true, newExpiry: newExpiry || undefined }) }); setSaving(false); if (res.ok) { setMessage('Renewal recorded.'); await load(); } else setMessage('Unable to record renewal.'); }
 if (!doc) return <div className="loading-state">Loading document…</div>;
 const bytes = doc.size || 0; const sizeText = bytes >= 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
 return <>
  <div style={{ marginBottom: 20 }}><Link href="/documents" style={{ color: '#638074', fontSize: 12 }}>← Back to documents</Link></div>
  <div className="page-heading"><div><div className="eyebrow" style={{ marginBottom: 8 }}>DOCUMENT RECORD</div><h1 style={{ overflowWrap: 'anywhere' }}>{doc.name}</h1><p>{doc.category || 'Other'} · Added {dateLabel(doc.createdAt?.slice(0, 10))}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => downloadFromApi(`/api/documents/${id}/file`, doc.name).catch(() => setMessage('Could not download this file.'))}>↓ Download file</button></div></div>
  {message && <div role="status" className={`notice ${message.startsWith('Unable') ? 'notice-error' : 'notice-success'}`} style={{ marginBottom: 16 }}>{message}</div>}
  <div className="detail-grid">
   <div style={{ display: 'grid', gap: 16 }}>
    <section className="card card-pad"><h2 className="card-title" style={{ marginBottom: 19 }}>Document details</h2><div className="info-list"><div className="info-label">Expiry date</div><div className="info-value">{dateLabel(doc.expiryDate)}</div><div className="info-label">Renewal status</div><div className="info-value">{doc.status === 'renewed' ? 'Renewed' : 'Active'}</div><div className="info-label">Category</div><div className="info-value">{doc.category || 'Other'}</div><div className="info-label">Tags</div><div className="info-value">{doc.tags?.length ? doc.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>) : 'No tags'}</div><div className="info-label">File size</div><div className="info-value">{sizeText}</div><div className="info-label">Detected date</div><div className="info-value">{dateLabel(doc.detectedExpiry)}</div></div></section>
    <section className="card card-pad"><h2 className="card-title">Edit details</h2><p className="card-subtitle" style={{ marginBottom: 18 }}>Update the category, tags, or expiry date.</p><div style={{ display: 'grid', gap: 14 }}><div className="form-field"><label className="field-label" htmlFor="expiry">Expiry date</label><input id="expiry" type="date" className="field" value={expiry} onChange={(e) => setExpiry(e.target.value)}/></div><div className="form-row"><div className="form-field"><label className="field-label" htmlFor="category">Category</label><input id="category" className="field" value={category} onChange={(e) => setCategory(e.target.value)}/></div><div className="form-field"><label className="field-label" htmlFor="tags">Tags</label><input id="tags" className="field" placeholder="Comma-separated tags" value={tags} onChange={(e) => setTags(e.target.value)}/></div></div><div><button className="button button-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button></div></div></section>
   </div>
   <aside style={{ display: 'grid', gap: 15, alignContent: 'start' }}>
    <section className="card card-pad"><div className="stat-icon" style={{ marginBottom: 13 }}>✓</div><h2 className="card-title">Mark as renewed</h2><p className="card-subtitle" style={{ lineHeight: 1.6 }}>Record that this document has been renewed. You can add its next expiry date now or later.</p><label className="field-label" htmlFor="new-expiry" style={{ marginTop: 16 }}>New expiry date <span style={{ fontWeight: 400, color: '#89958f' }}>(optional)</span></label><input id="new-expiry" className="field" type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)}/><button className="button button-primary" style={{ width: '100%', marginTop: 12 }} disabled={saving} onClick={renew}>✓ Mark as renewed</button></section>
    <section style={{ borderRadius: 12, background: '#f0f5f1', border: '1px solid #e0eae1', padding: 15, color: '#61766a', fontSize: 11, lineHeight: 1.65 }}><strong style={{ color: '#315b45' }}>Renewal reminder</strong><br/>If email reminders are enabled, they stop once a document is marked renewed.</section>
   </aside>
  </div>
 </>;
}
