import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default nextConfig;
