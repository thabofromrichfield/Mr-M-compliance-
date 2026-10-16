'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function DocumentDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [expiry, setExpiry] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  async function load() {
    const r = await fetch(`/api/documents/${id}`);
    if (!r.ok) { router.replace('/documents'); return; }
    const d = await r.json();
    setDoc(d.document);
    setExpiry(d.document.expiryDate || '');
    setCategory(d.document.category || '');
    setTags((d.document.tags || []).join(', '));
  }
  useEffect(() => { load(); }, [id]);

  async function save() {
    await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryDate: expiry || null, category, tags: tags.split(',').map((s) => s.trim()).filter(Boolean) }),
    });
    load();
  }

  async function renew() {
    await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renewed: true, newExpiry: newExpiry || undefined }),
    });
    load();
  }

  if (!doc) return <div>Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{doc.name}</h1>
      <div className="bg-white rounded shadow p-4 space-y-3">
        <div><span className="text-slate-500">Category:</span> {doc.category}</div>
        <div><span className="text-slate-500">Tags:</span> {(doc.tags || []).join(', ') || '—'}</div>
        <div><span className="text-slate-500">Expiry:</span> {doc.expiryDate || '—'}</div>
        <div><span className="text-slate-500">Status:</span> {doc.status}</div>
        <div><span className="text-slate-500">Size:</span> {doc.size} bytes</div>
        <a href={`/api/documents/${id}/file`} target="_blank" className="text-blue-600">View / Download file</a>
      </div>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Edit</h2>
        <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="border p-2 rounded w-full" />
        <input value={category} onChange={(e) => setCategory(e.target.value)} className="border p-2 rounded w-full" placeholder="Category" />
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="border p-2 rounded w-full" placeholder="Tags" />
        <button onClick={save} className="bg-slate-900 text-white px-4 py-2 rounded">Save</button>
      </div>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold">Mark as renewed</h2>
        <p className="text-sm text-slate-500">Optionally set a new expiry date for the renewed document.</p>
        <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="border p-2 rounded w-full" />
        <button onClick={renew} className="bg-green-600 text-white px-4 py-2 rounded">Mark as renewed</button>
      </div>
    </div>
  );
}
