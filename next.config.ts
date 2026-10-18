import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.e2b.app'],
  serverExternalPackages: ['firebase-admin', 'pdfjs-dist'],
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default nextConfig;
