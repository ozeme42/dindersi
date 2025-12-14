
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Add srcDir to specify that the app directory is inside 'src'
  srcDir: 'src',
  typescript: {
    ignoreBuildErrors: true,
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
        hostname: '**.firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
