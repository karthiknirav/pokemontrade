import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // NEXT_DIST_DIR used locally to avoid conflict with Windows paths; Vercel uses default .next
  distDir: process.env.NEXT_DIST_DIR ?? ".next"
};

export default nextConfig;
