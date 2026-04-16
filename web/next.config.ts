import type { NextConfig } from "next";

// Use default Turbopack root to match Vercel's outputFileTracingRoot.
// serverExternalPackages prevents Next.js from bundling heavy native binaries
// (Chromium, Puppeteer, Playwright) into the serverless function — without this
// the Vercel build hangs during file tracing or exceeds the 250 MB bundle limit.
const nextConfig: NextConfig = {
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "playwright",
  ],
};

export default nextConfig;
