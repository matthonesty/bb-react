import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zkillboard.com',
      },
      {
        protocol: 'https',
        hostname: 'images.evetech.net',
      },
      {
        protocol: 'https',
        hostname: 'everef.net',
      },
    ],
  },
};

export default nextConfig;
