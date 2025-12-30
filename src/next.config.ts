
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Add srcDir to specify that the app directory is inside 'src'
  srcDir: 'src',
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    allowedDevOrigins: ["https://6000-firebase-degerleryedek-1766077914929.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"],
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
};

export default nextConfig;
