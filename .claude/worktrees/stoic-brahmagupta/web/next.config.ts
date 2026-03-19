import type { NextConfig } from "next";

// Fix workspace root explicitly to this app directory to avoid
// Next.js inferring a higher-level root when multiple lockfiles exist.
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
