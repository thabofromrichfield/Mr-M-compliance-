import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ClearLedger — Compliance, under control', description: 'A private workspace for compliance documents, expiry dates, and timely renewals.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
