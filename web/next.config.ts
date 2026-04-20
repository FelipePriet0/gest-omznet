import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  // Impede que a página seja carregada em iframe (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Impede MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Controla informações enviadas no Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Desativa features de browser desnecessárias
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Força HTTPS por 1 ano
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval necessário para Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// serverExternalPackages prevents Next.js from bundling heavy native binaries
// (Chromium, Puppeteer, Playwright) into the serverless function — without this
// the Vercel build hangs during file tracing or exceeds the 250 MB bundle limit.
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(configDir, ".."),
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
    webpackBuildWorker: false,
  },
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium",
    "playwright",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
