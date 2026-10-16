import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClearLedger | Compliance workspace',
  description: 'A private workspace for compliance documents, renewals, and expiry alerts.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
