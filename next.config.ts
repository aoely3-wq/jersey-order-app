import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            // Allow embedding checkout.doku.com in iframe
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://checkout.doku.com https://*.doku.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
