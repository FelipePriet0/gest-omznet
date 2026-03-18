import type { NextConfig } from "next";

// Use default Turbopack root to match Vercel's outputFileTracingRoot
// Removing explicit turbopack.root avoids mismatch warnings in build logs.
const nextConfig: NextConfig = {};

export default nextConfig;
