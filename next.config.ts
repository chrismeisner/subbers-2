// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent ESLint errors from blocking production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // …other config options here
};

export default nextConfig;
