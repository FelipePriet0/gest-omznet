import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sanitizeFilename(input: string): string {
  return (input || "ficha").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "ficha";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.nextUrl);
  const tipoRaw = url.searchParams.get("tipo") || "";
  const id = url.searchParams.get("id") || "";
  const t = tipoRaw.toLowerCase();
  if ((t !== "pf" && t !== "pj") || !id) {
    return new Response(JSON.stringify({ error: "Parâmetros inválidos. Use ?tipo=pf|pj&id=<id>" }), { status: 400 });
  }

  const origin = `${url.protocol}//${url.host}`;
  const target = `${origin}/cadastro/${t}/${encodeURIComponent(id)}?print=1&from=export`;

  try {
    const chromium = await import("@sparticuz/chromium");
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
      await page.waitForSelector("#mz-print-root", { timeout: 30_000 });
      await page.emulateMediaType('screen');
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
      return new Response(pdf as any, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${fileName}"`,
          "cache-control": "no-store",
        },
      });
    } finally {
      try { await (browser as any).close(); } catch {}
    }
  } catch {}

  try {
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
      return new Response(pdf as any, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${fileName}"`,
          "cache-control": "no-store",
        },
      });
    } finally {
      try { await (browser as any).close(); } catch {}
    }
  } catch {}

  const hint = {
    message: "Exportação direta para PDF não está habilitada neste ambiente.",
    expected: { tipo: t, id },
    try_url: target,
  };
  return new Response(JSON.stringify(hint), { status: 501, headers: { "content-type": "application/json" } });
}
