import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper handling of pdf-lib in production builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure pdf-lib works properly in client-side builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  // Ensure static files are properly served
  async headers() {
    return [
      {
        source: '/charSheet.pdf',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/pdf',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
