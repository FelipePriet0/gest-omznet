import { NextRequest } from "next/server";

export const runtime = "nodejs"; // require Node.js runtime for future headless rendering
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitizeFilename(input: string): string {
  return (input || "ficha").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "ficha";
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ tipo: string; id: string }> }) {
  const { tipo, id } = (await ctx.params) || ({} as any);
  const t = String(tipo || "").toLowerCase();
  if (t !== "pf" && t !== "pj") {
    return new Response(JSON.stringify({ error: "tipo inválido; use 'pf' ou 'pj'" }), { status: 400 });
  }
  if (!id) return new Response(JSON.stringify({ error: "id ausente" }), { status: 400 });

  // Build absolute URL to the Expanded page (PF/PJ)
  const url = new URL(req.nextUrl);
  const origin = `${url.protocol}//${url.host}`;
  const target = `${origin}/cadastro/${t}/${id}?print=1&from=export`;


  const preferPlaywright = !process.env.VERCEL && process.platform === 'win32';

  // Prefer Playwright on local Windows (dev) for smoother DX
  if (preferPlaywright) try {
    // @ts-ignore
    const { chromium } = await import("playwright");
    const browser = await (chromium as any).launch({ headless: true });
    try {
      const page = await browser.newPage();
      const cookie = req.headers.get('cookie') || '';
      await page.goto(target, { waitUntil: "networkidle" });
      await page.waitForSelector("#mz-print-root", { timeout: 30_000 });
      await (page as any).emulateMedia({ media: 'screen' });
      const metrics = await page.evaluate(() => {
        const el = document.getElementById('mz-print-root');
        const pxPerInch = 96;
        const pxHeight = el ? Math.max(el.scrollHeight, el.offsetHeight) : document.body.scrollHeight;
        const pxWidth = el ? Math.max(el.scrollWidth, el.offsetWidth) : document.body.scrollWidth;
        const mmPerPx = 25.4 / pxPerInch;
        return { heightMM: Math.ceil(pxHeight * mmPerPx), widthMM: Math.ceil(pxWidth * mmPerPx) };
      });
      const widthMM = Math.max(210, metrics.widthMM);
      const pdf = await page.pdf({
        printBackground: true,
        width: `${widthMM}mm`,
        height: `${metrics.heightMM}mm`,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      const displayName = await page.$eval('#mz-print-root', (el: Element) => (el.getAttribute('data-name')||'').toString());
      const base = displayName ? `Ficha-${t.toUpperCase()}-${displayName}-${id}.pdf` : `Ficha-${t.toUpperCase()}-${id}.pdf`;
      const fileName = sanitizeFilename(base);
      return new Response(pdf, { status: 200, headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${fileName}"`, "cache-control": "no-store" } });
    } finally { try { await browser.close(); } catch {} }
  } catch {}

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
      const cookie = req.headers.get('cookie') || '';
      if (cookie) await page.setExtraHTTPHeaders({ Cookie: cookie });
      await page.goto(target, { waitUntil: "networkidle0", timeout: 90_000 });
      // Ensure body ready
      await page.waitForSelector("#mz-print-root", { timeout: 30_000 });
      await page.emulateMediaType('screen');
      // Measure content to generate single-page PDF height
      const metrics = await page.evaluate(() => {
        const el = document.getElementById('mz-print-root');
        const pxPerInch = 96; // CSS reference pixel
        const pxHeight = el ? Math.max(el.scrollHeight, el.offsetHeight) : document.body.scrollHeight;
        const pxWidth = el ? Math.max(el.scrollWidth, el.offsetWidth) : document.body.scrollWidth;
        const mmPerPx = 25.4 / pxPerInch;
        return {
          heightMM: Math.ceil(pxHeight * mmPerPx),
          widthMM: Math.ceil(pxWidth * mmPerPx),
        };
      });
      const widthMM = Math.max(210, metrics.widthMM);
      const pdf = await page.pdf({
        printBackground: true,
        width: `${widthMM}mm`,
        height: `${metrics.heightMM}mm`,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      const displayName = await page.$eval('#mz-print-root', (el: Element) => (el.getAttribute('data-name')||'').toString());
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
      await (page as any).emulateMedia({ media: 'screen' });
      const metrics = await page.evaluate(() => {
        const el = document.getElementById('mz-print-root');
        const pxPerInch = 96;
        const pxHeight = el ? Math.max(el.scrollHeight, el.offsetHeight) : document.body.scrollHeight;
        const pxWidth = el ? Math.max(el.scrollWidth, el.offsetWidth) : document.body.scrollWidth;
        const mmPerPx = 25.4 / pxPerInch;
        return {
          heightMM: Math.ceil(pxHeight * mmPerPx),
          widthMM: Math.ceil(pxWidth * mmPerPx),
        };
      });
      const widthMM = Math.max(210, metrics.widthMM);
      const pdf = await page.pdf({
        printBackground: true,
        width: `${widthMM}mm`,
        height: `${metrics.heightMM}mm`,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      const displayName = await page.$eval('#mz-print-root', (el: Element) => (el.getAttribute('data-name')||'').toString());
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
