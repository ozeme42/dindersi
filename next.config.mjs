/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
        protocol: "https",
        hostname: "picsum.photos",
      }
    ],
  },
  experimental: {
    // This is to allow the Next.js dev server to accept requests from the
    // Firebase Studio development environment.
    allowedDevOrigins: ['*'],
  },
};

export default nextConfig;
