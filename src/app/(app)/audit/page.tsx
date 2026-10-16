'use client';
import { useEffect, useState } from 'react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/audit').then((r) => r.json()).then((d) => setLogs(d.logs || []));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr><th className="p-3 text-left">Time</th><th className="p-3 text-left">Actor</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Resource</th><th className="p-3 text-left">Details</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="p-3">{l.actor}</td>
                <td className="p-3">{l.action}</td>
                <td className="p-3">{l.resourceType} {l.resourceId || ''}</td>
                <td className="p-3">{l.details || ''}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
