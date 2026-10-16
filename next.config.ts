import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.e2b.app', 'localhost', '127.0.0.1'],
  serverExternalPackages: ['pdfjs-dist'],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.e2b.app', 'localhost:3000'],
    },
  },
};

export default nextConfig;
