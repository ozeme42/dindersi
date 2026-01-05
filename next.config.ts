
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // This key is moved out of experimental for newer Next.js versions.
    // However, the error log indicates it might be an invalid experimental key
    // which suggests it should be top-level. We'll try moving it out.
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Correctly placing allowedDevOrigins at the top level
  allowedDevOrigins: ["https://6000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"],
};

export default nextConfig;
