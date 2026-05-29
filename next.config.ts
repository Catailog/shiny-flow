import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['ts-morph', 'typescript', 'playwright'],
  images: {
    dangerouslyAllowSVG: true,
    // base64 data URL 이미지 허용
    unoptimized: true,
  },
};

export default nextConfig;
