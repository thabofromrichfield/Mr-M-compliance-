'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function urgency(doc: any) {
  if (!doc.expiryDate) return { label: 'No expiry', cls: 'bg-slate-200 text-slate-700' };
  const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000);
  if (doc.status === 'renewed') return { label: 'Renewed', cls: 'bg-blue-100 text-blue-700' };
  if (days < 0) return { label: 'Expired', cls: 'bg-red-200 text-red-800' };
  if (days <= 7) return { label: `${days}d`, cls: 'bg-red-100 text-red-700' };
  if (days <= 30) return { label: `${days}d`, cls: 'bg-amber-100 text-amber-700' };
  return { label: `${days}d`, cls: 'bg-green-100 text-green-700' };
}

export default function Dashboard() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents').then((r) => r.json()).then((d) => {
      setDocs(d.documents || []);
      setLoading(false);
    });
  }, []);

  const counts = {
    total: docs.length,
    expired: docs.filter((d) => d.expiryDate && new Date(d.expiryDate).getTime() < Date.now() && d.status !== 'renewed').length,
    urgent: docs.filter((d) => d.expiryDate && (new Date(d.expiryDate).getTime() - Date.now()) / 86400000 <= 7 && d.status !== 'renewed').length,
    safe: docs.filter((d) => !d.expiryDate || (new Date(d.expiryDate).getTime() - Date.now()) / 86400000 > 30).length,
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total" value={counts.total} />
        <Stat label="Expired" value={counts.expired} cls="text-red-600" />
        <Stat label="Urgent (≤7d)" value={counts.urgent} cls="text-amber-600" />
        <Stat label="Safe" value={counts.safe} cls="text-green-600" />
      </div>
      <div className="bg-white rounded shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Documents</h2>
          <Link href="/documents" className="text-blue-600 text-sm">Manage →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Expiry</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const u = urgency(d);
              return (
                <tr key={d.id} className="border-t">
                  <td className="p-3"><Link href={`/documents/${d.id}`} className="text-blue-600">{d.name}</Link></td>
                  <td className="p-3">{d.category}</td>
                  <td className="p-3">{d.expiryDate || '—'}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${u.cls}`}>{u.label}</span></td>
                </tr>
              );
            })}
            {docs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No documents yet. <Link href="/documents" className="text-blue-600">Upload one</Link></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, cls }: any) {
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${cls || ''}`}>{value}</div>
    </div>
  );
}
