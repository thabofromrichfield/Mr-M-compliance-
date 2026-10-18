'use client';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, downloadApi } from '@/lib/clientFetch';
import type { ComplianceDocument } from '@/lib/types';
import { formatDate, urgency } from '@/lib/format';

type DuplicateMatch = {
  id: string;
  name: string;
  category: string;
  expiryDate: string | null;
  matchType: 'exact-file' | 'same-name-and-expiry';
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [file, setFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('Licence');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<ComplianceDocument | null>(null);
  const [expiry, setExpiry] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [duplicateDetectedExpiry, setDuplicateDetectedExpiry] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ComplianceDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [renewalTarget, setRenewalTarget] = useState<ComplianceDocument | null>(null);
  const [renewalExpiry, setRenewalExpiry] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await apiFetch('/api/documents');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load documents.');
    setDocs(data.documents || []);
    setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const categories = useMemo(() => ['All categories', ...new Set(docs.map(d => d.category).filter(Boolean))], [docs]);
  const filtered = docs.filter(doc =>
    (category === 'All categories' || doc.category === category) &&
    `${doc.name} ${doc.category} ${doc.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
  );

  async function uploadFile(confirmDuplicate = false) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', uploadCategory);
      form.append('tags', tags);
      if (confirmDuplicate) form.append('confirmDuplicate', 'true');
      const res = await apiFetch('/api/documents', { method: 'POST', body: form });
      const data = await res.json();
      if (res.status === 409 && Array.isArray(data.duplicateMatches)) {
        setDuplicates(data.duplicateMatches);
        setDuplicateDetectedExpiry(data.detectedExpiry || null);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setDuplicates([]);
      setDraft(data.document);
      setExpiry(data.document.detectedExpiry || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally { setUploading(false); }
  }
  async function upload(event: React.FormEvent) {
    event.preventDefault();
    await uploadFile(false);
  }
  async function confirmDuplicate() {
    setDuplicates([]);
    await uploadFile(true);
  }
  async function confirmExpiry() {
    if (!draft) return;
    setError('');
    try {
      const res = await apiFetch(`/api/documents/${draft.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiryDate: expiry || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the expiry date.');
      setDraft(null);
      setFile(null);
      setTags('');
      await load();
      flash('Document saved. Expiry tracking is active.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the expiry date.'); }
  }
  async function removeDoc(doc: ComplianceDocument) {
    if (!confirm(`Remove “${doc.name}” and its encrypted file?`)) return;
    const res = await apiFetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    if (res.ok) { await load(); flash('Document removed.'); }
  }
  async function updateDate(doc: ComplianceDocument) {
    const next = prompt('Enter the expiry date (YYYY-MM-DD):', doc.expiryDate || '');
    if (next === null) return;
    const res = await apiFetch(`/api/documents/${doc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiryDate: next }),
    });
    if (res.ok) { await load(); flash('Expiry date updated.'); }
    else flash('That expiry date could not be saved.');
  }
  function markRenewed(doc: ComplianceDocument) {
    setRenewalTarget(doc);
    setRenewalExpiry('');
    setError('');
  }
  async function confirmRenewal(event: React.FormEvent) {
    event.preventDefault();
    if (!renewalTarget || !renewalExpiry) return;
    setError('');
    const res = await apiFetch(`/api/documents/${renewalTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markRenewed: true, expiryDate: renewalExpiry }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'The renewal could not be recorded.'); return; }
    setRenewalTarget(null);
    await load();
    flash(`Renewal recorded. New expiry: ${formatDate(data.document.expiryDate)}.`);
  }
  async function previewDocument(doc: ComplianceDocument) {
    try {
      const res = await apiFetch(`/api/documents/${doc.id}/file?preview=1`);
      if (!res.ok) throw new Error('Could not open this certificate.');
      const url = URL.createObjectURL(await res.blob());
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch { flash('Could not preview that file.'); }
  }
  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewDoc(null);
  }
  async function downloadDocument(doc: ComplianceDocument) {
    try {
      const res = await apiFetch(`/api/documents/${doc.id}/file`);
      if (!res.ok) throw new Error('Download failed.');
      const url = URL.createObjectURL(await res.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = doc.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch { flash('Could not download that file.'); }
  }
  function flash(message: string) { setToast(message); setTimeout(() => setToast(''), 3200); }

  return <>
    <div className="page-heading"><div><div className="heading-kicker">YOUR PRIVATE DOCUMENT LIBRARY</div><h1>Documents</h1><p>Store important paperwork and keep its expiry date up to date.</p></div><a href="#upload" className="primary-btn"><span className="button-icon">＋</span> Add a document</a></div>
    <section className="card section-card" id="upload">
      <div className="section-header"><div><div className="section-title">Add to your library</div><div className="section-subtitle">Only the expiry date is detected from document content. You confirm before tracking begins. Existing files are checked for duplicates before storage.</div></div></div>
      <form onSubmit={upload}><div className="form-grid">
        <div className="form-item"><label>Document file</label><label className="drop-zone"><strong>{file ? file.name : 'Choose a PDF, DOCX, TXT, CSV, or image'}</strong><span>Up to 4 MB · files are encrypted before storage<input type="file" accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} /></span></label></div>
        <div className="form-item"><label htmlFor="category">Category</label><select id="category" className="field" value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}><option>Licence</option><option>Insurance</option><option>Identity</option><option>Business certificate</option><option>Government paperwork</option><option>Other</option></select><label htmlFor="tags" style={{ marginTop: 6 }}>Tags <span style={{ fontWeight: 400, color: '#8a978f' }}>· optional, comma separated</span></label><input id="tags" className="field" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. annual, Gauteng, vehicle" /><button className="primary-btn" disabled={!file || uploading} style={{ marginTop: 6, alignSelf: 'start' }}>{uploading ? 'Checking and scanning…' : 'Upload and scan expiry'}</button></div>
      </div></form>{error && !draft && !renewalTarget && <div className="notice error section-gap">{error}</div>}
    </section>

    <section className="card section-card section-gap"><div className="section-header"><div><div className="section-title">All documents <span className="tag">{filtered.length}</span></div><div className="section-subtitle">A clear view of every stored item and its renewal status.</div></div><button className="secondary-btn" onClick={() => downloadApi('/api/export').catch(() => flash('Backup could not be downloaded.'))}>↓ Export ZIP</button></div>
      <div className="toolbar"><input className="search-field" aria-label="Search documents" placeholder="Search documents or tags…" value={query} onChange={e => setQuery(e.target.value)} /><select className="select-field" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
      {loading ? <div className="empty-state">Loading documents…</div> : !filtered.length ? <div className="empty-state"><strong>{docs.length ? 'No matching documents' : 'No documents yet'}</strong><span>{docs.length ? 'Try another search or category.' : 'Upload your first document above to start tracking its expiry.'}</span></div> : <div className="document-table-wrap"><table className="document-table"><thead><tr><th>Document</th><th>Category & tags</th><th>Expiry date</th><th>Urgency</th><th>Actions</th></tr></thead><tbody>{filtered.map(doc => { const u = urgency(doc); return <tr key={doc.id}><td><div className="doc-name-wrap"><div className="file-icon">▤</div><div><div className="doc-name">{doc.name}</div><div className="doc-meta">Added {formatDate(doc.createdAt.slice(0, 10))} · {(doc.size / 1024).toFixed(0)} KB</div></div></div></td><td><div>{doc.category}</div><div className="tag-list" style={{ marginTop: 5 }}>{doc.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div></td><td>{formatDate(doc.expiryDate)}{doc.detectedExpiry && <div className="doc-meta">Detected · confirmed</div>}</td><td><span className={`urgency ${u.kind}`}><i className="urgency-dot" />{u.label}</span></td><td><div className="table-actions"><button className="icon-button" title="Preview certificate" aria-label={`Preview ${doc.name}`} onClick={() => previewDocument(doc)}>◉</button><button className="icon-button" title="Download document" aria-label={`Download ${doc.name}`} onClick={() => downloadDocument(doc)}>↓</button><button className="icon-button" title="Edit expiry date" aria-label={`Edit expiry for ${doc.name}`} onClick={() => updateDate(doc)}>✎</button><button className="icon-button" title="Record renewal" aria-label={`Record renewal for ${doc.name}`} disabled={!doc.expiryDate} onClick={() => markRenewed(doc)}>✓</button><button className="icon-button danger" title="Remove document" aria-label={`Remove ${doc.name}`} onClick={() => removeDoc(doc)}>×</button></div></td></tr>; })}</tbody></table></div>}
    </section>

    {duplicates.length > 0 && <div className="modal-backdrop"><div className="modal duplicate-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-title"><div className="eyebrow">POSSIBLE DUPLICATE</div><h2 id="duplicate-title">This certificate may already be in your library</h2><p>We found a matching file or a document with the same name and expiry date. Check the existing record before adding another copy.</p><div className="duplicate-match-list">{duplicates.map(match => <div className="duplicate-match" key={match.id}><span className="duplicate-match-icon">✓</span><div><strong>{match.name}</strong><small>{match.category}{match.expiryDate ? ` · expires ${formatDate(match.expiryDate)}` : ''}</small><span className="duplicate-match-kind">{match.matchType === 'exact-file' ? 'Exact file match' : match.matchType === 'same-name-and-expiry' ? 'Same name and expiry date' : 'Same document name'}</span></div></div>)}</div>{duplicateDetectedExpiry && <p className="duplicate-detected-date">New file expiry detected: <strong>{formatDate(duplicateDetectedExpiry)}</strong></p>}<p className="duplicate-question">Do you still want to add a second copy?</p><div className="modal-actions"><button className="secondary-btn" onClick={() => setDuplicates([])}>Cancel upload</button><button className="primary-btn" disabled={uploading} onClick={confirmDuplicate}>{uploading ? 'Adding…' : 'Yes, add another copy'}</button></div></div></div>}

    {draft && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="expiry-title"><div className="eyebrow">CONFIRM EXPIRY DATE</div><h2 id="expiry-title">{draft.detectedExpiry ? 'We found a possible expiry date' : 'Add an expiry date'}</h2><p>{draft.detectedExpiry ? `We only scanned the document for its expiry date. Please confirm that ${formatDate(draft.detectedExpiry)} is correct before we begin tracking.` : 'No expiry date was detected. Enter the date manually; no other document content was extracted.'}</p>{error && <div className="notice error">{error}</div>}<div className="form-item" style={{ marginTop: 16 }}><label htmlFor="expiry">Expiry date</label><input className="field" id="expiry" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} required /></div><div className="modal-actions"><button className="secondary-btn" onClick={() => setDraft(null)}>Cancel</button><button className="primary-btn" onClick={confirmExpiry} disabled={!expiry}>Confirm and track</button></div></div></div>}

    {renewalTarget && <div className="modal-backdrop"><form className="modal renewal-modal" role="dialog" aria-modal="true" aria-labelledby="renewal-title" onSubmit={confirmRenewal}><div className="eyebrow">RECORD RENEWAL</div><h2 id="renewal-title">Enter the new expiry date</h2><p>Use the actual date printed on <strong>{renewalTarget.name}</strong>. Renewal periods vary, so ClearLedger will not add a fixed number of years.</p>{error && <div className="notice error">{error}</div>}<div className="form-item" style={{ marginTop: 16 }}><label htmlFor="renewal-expiry">New expiry date</label><input className="field" id="renewal-expiry" type="date" value={renewalExpiry} onChange={e => setRenewalExpiry(e.target.value)} required /></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setRenewalTarget(null)}>Cancel</button><button className="primary-btn" disabled={!renewalExpiry}>Save renewal date</button></div></form></div>}

    {previewDoc && previewUrl && <div className="modal-backdrop preview-backdrop" onClick={closePreview}><section className="modal certificate-preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title" onClick={event => event.stopPropagation()}><header className="certificate-preview-header"><div><div className="eyebrow">CERTIFICATE PREVIEW</div><h2 id="preview-title">{previewDoc.name}</h2><p>{previewDoc.category} · Expires {formatDate(previewDoc.expiryDate)}</p></div><div className="certificate-preview-actions"><button className="secondary-btn" onClick={() => downloadDocument(previewDoc)}>↓ Download</button><button className="icon-button" aria-label="Close preview" onClick={closePreview}>×</button></div></header>{previewDoc.mimeType === 'application/pdf' || previewDoc.mimeType.startsWith('text/') ? <iframe className="certificate-preview-frame" src={previewUrl} title={`Preview of ${previewDoc.name}`} /> : previewDoc.mimeType.startsWith('image/') ? <div className="certificate-image-stage"><img src={previewUrl} alt={`Preview of ${previewDoc.name}`} /></div> : <div className="empty-state preview-unavailable"><strong>Preview is not available for this file type.</strong><span>Download the original document to view it.</span></div>}</section></div>}
    {toast && <div className="toast">{toast}</div>}
  </>;
}
