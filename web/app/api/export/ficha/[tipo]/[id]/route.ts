import { NextRequest } from "next/server";

export const runtime = "nodejs"; // require Node.js runtime for future headless rendering
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitizeFilename(input: string): string {
  return (input || "ficha").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "ficha";
}

export async function GET(req: NextRequest, ctx: { params: { tipo: string; id: string } }) {
  const { tipo, id } = ctx.params || ({} as any);
  const t = String(tipo || "").toLowerCase();
  if (t !== "pf" && t !== "pj") {
    return new Response(JSON.stringify({ error: "tipo inválido; use 'pf' ou 'pj'" }), { status: 400 });
  }
  if (!id) return new Response(JSON.stringify({ error: "id ausente" }), { status: 400 });

  // Build absolute URL to the Expanded page (PF/PJ)
  const url = new URL(req.nextUrl);
  const origin = `${url.protocol}//${url.host}`;
  const target = `${origin}/cadastro/${t}/${id}?print=1&from=export`;

  // Try Puppeteer Core + @sparticuz/chromium (serverless-friendly)
  try {
    // Dynamic imports so build doesn't fail when packages are not installed in some envs
    // @ts-ignore
    const chromium = await import("@sparticuz/chromium");
    // @ts-ignore
    const puppeteer = await import("puppeteer-core");

    const executablePath = await (chromium as any).executablePath();
    const browser = await (puppeteer as any).launch({
      args: (chromium as any).args,
      defaultViewport: (chromium as any).defaultViewport,
      executablePath,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.goto(target, { waitUntil: "networkidle0", timeout: 90_000 });
      // Ensure body ready
      await page.waitForSelector("#mz-print-root", { timeout: 30_000 });
      const displayName = await page.$eval('#mz-print-root', el => (el.getAttribute('data-name')||'').toString());
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
        preferCSSPageSize: true,
      });
      const base = displayName ? `Ficha-${t.toUpperCase()}-${displayName}-${id}.pdf` : `Ficha-${t.toUpperCase()}-${id}.pdf`;
      const fileName = sanitizeFilename(base);
      return new Response(pdf, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${fileName}"`,
          "cache-control": "no-store",
        },
      });
    } finally {
      try { await browser.close(); } catch {}
    }
  } catch {}

  // Fallback: try Playwright if available
  try {
    // @ts-ignore
    const { chromium } = await import("playwright");
    const browser = await (chromium as any).launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(target, { waitUntil: "networkidle" });
      await page.waitForSelector("#mz-print-root", { timeout: 30_000 });
      const displayName = await page.$eval('#mz-print-root', el => (el.getAttribute('data-name')||'').toString());
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
      });
      const base = displayName ? `Ficha-${t.toUpperCase()}-${displayName}-${id}.pdf` : `Ficha-${t.toUpperCase()}-${id}.pdf`;
      const fileName = sanitizeFilename(base);
      return new Response(pdf, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${fileName}"`,
          "cache-control": "no-store",
        },
      });
    } finally {
      try { await browser.close(); } catch {}
    }
  } catch {}

  // Nothing available: explain how to enable
  const hint = {
    message: "Exportação direta para PDF não está habilitada neste ambiente.",
    install:
      "Instale 'puppeteer-core' + '@sparticuz/chromium' (serverless) ou 'playwright' (servidor com Chromium).",
    steps: [
      "npm i puppeteer-core @sparticuz/chromium  --save (ou npm i -D playwright)",
      "Verifique se o runtime do Next está em Node.js (export const runtime = 'nodejs')",
    ],
    try_url: target,
  };
  return new Response(JSON.stringify(hint), { status: 501, headers: { "content-type": "application/json" } });
}
