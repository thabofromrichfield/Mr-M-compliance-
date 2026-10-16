'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [categories] = useState(['licences', 'insurance', 'ID', 'business certificates', 'other']);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<any>(null); // uploaded doc awaiting confirmation
  const [expiryInput, setExpiryInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch('/api/documents');
    const d = await r.json();
    setDocs(d.documents || []);
  }
  useEffect(() => { load(); }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    fd.append('tags', tags);
    const r = await fetch('/api/documents', { method: 'POST', body: fd });
    const d = await r.json();
    setUploading(false);
    if (!r.ok) { alert(d.error || 'Upload failed'); return; }
    setPending(d.document);
    setExpiryInput(d.document.expiryDate || '');
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    load();
  }

  async function confirmExpiry() {
    if (!pending) return;
    await fetch(`/api/documents/${pending.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryDate: expiryInput || null }),
    });
    setPending(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents</h1>

      <form onSubmit={upload} className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Upload document</h2>
        <input ref={inputRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block" />
        <div className="flex gap-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border p-2 rounded">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="border p-2 rounded flex-1" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <button disabled={uploading || !file} className="bg-slate-900 text-white px-4 py-2 rounded">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {pending && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-3">
          <h2 className="font-semibold">Confirm expiry date for {pending.name}</h2>
          {pending.candidates?.length ? (
            <p className="text-sm">Detected dates: {pending.candidates.join(', ')}. Latest used as default.</p>
          ) : (
            <p className="text-sm">No date detected. Please enter expiry manually.</p>
          )}
          <input type="date" value={expiryInput} onChange={(e) => setExpiryInput(e.target.value)} className="border p-2 rounded" />
          <div className="flex gap-2">
            <button onClick={confirmExpiry} className="bg-blue-600 text-white px-4 py-2 rounded">Confirm</button>
            <button onClick={() => setPending(null)} className="px-4 py-2 rounded border">Skip</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Tags</th>
              <th className="text-left p-3">Expiry</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3"><Link href={`/documents/${d.id}`} className="text-blue-600">{d.name}</Link></td>
                <td className="p-3">{d.category}</td>
                <td className="p-3">{(d.tags || []).join(', ')}</td>
                <td className="p-3">{d.expiryDate || '—'}</td>
                <td className="p-3 space-x-2">
                  <a href={`/api/documents/${d.id}/file`} target="_blank" className="text-slate-600">View</a>
                  <button onClick={() => remove(d.id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No documents.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
