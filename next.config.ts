import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    // base64 data URL 이미지 허용
    unoptimized: true,
  },
};

export default nextConfig;
