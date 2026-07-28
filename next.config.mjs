/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Next's built-in optimizer needs sharp (Node-only) and doesn't run on the
    // Workers runtime; images are served as-is (product images are already
    // client-side compressed before upload, see lib/utils.ts compressImage).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: process.env.R2_PUBLIC_DOMAIN || 'images.example.com',
      }
    ]
  }
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
