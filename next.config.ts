import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV === 'development';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  /* config options here */
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
        hostname: '**',
      },
       {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

// Don't use bundle analyzer in dev, it conflicts with turbopack
export default isDev ? nextConfig : withBundleAnalyzer(nextConfig);
