import { Suspense } from 'react';
import AppShell from './AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
