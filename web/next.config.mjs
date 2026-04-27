import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform().catch(() => {});
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
    ],
  },
  allowedDevOrigins: ['localhost', '*.replit.dev', '*.repl.co', '*.worf.replit.dev', '*.kirk.replit.dev'],
};

export default nextConfig;
