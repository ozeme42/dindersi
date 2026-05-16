
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // allowedDevOrigins experimental altından kök dizine taşındı
  allowedDevOrigins: [
    "6000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev",
    "9000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev",
    "https://6000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev",
    "https://9000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"
  ]
};

export default nextConfig;
