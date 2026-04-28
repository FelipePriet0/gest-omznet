import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { fetchFichaPF, fetchFichaPJ } from "@/lib/pdf/fetchFichaData";
import { FichaPfPdf } from "@/lib/pdf/FichaPfPdf";
import { FichaPjPdf } from "@/lib/pdf/FichaPjPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function sanitizeFilename(input: string): string {
  return (input || "ficha").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "ficha";
}

async function requireAuth(req: NextRequest): Promise<
  | { error: Response; token?: never; user?: never }
  | { error: null; token: string; user: object }
> {
  let accessToken: string | null = null;

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.slice(7).trim();
  }

  if (!accessToken) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    for (const pair of cookieHeader.split(";")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
        try {
          const parsed = JSON.parse(decodeURIComponent(value));
          accessToken = parsed?.access_token ?? null;
        } catch {
          // cookie corrompido
        }
        break;
      }
    }
  }

  if (!accessToken) {
    return {
      error: new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return {
      error: new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }

  return { error: null, token: accessToken, user };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ tipo: string; id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { tipo, id } = await ctx.params;
  const t = String(tipo || "").toLowerCase();
  if (t !== "pf" && t !== "pj") {
    return new Response(JSON.stringify({ error: "tipo inválido; use 'pf' ou 'pj'" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!id) {
    return new Response(JSON.stringify({ error: "id ausente" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    let pdfStream: NodeJS.ReadableStream;
    let displayName = "";

    if (t === "pf") {
      const { app, pf, notes } = await fetchFichaPF(id, auth.token);
      displayName = app.primary_name || "";
      const element = React.createElement(FichaPfPdf, { app, pf, notes });
      pdfStream = await renderToStream(element as any);
    } else {
      const { app, pj, notes } = await fetchFichaPJ(id, auth.token);
      displayName = app.primary_name || "";
      const element = React.createElement(FichaPjPdf, { app, pj, notes });
      pdfStream = await renderToStream(element as any);
    }

    const base = displayName
      ? `Ficha-${t.toUpperCase()}-${displayName}-${id}.pdf`
      : `Ficha-${t.toUpperCase()}-${id}.pdf`;
    const fileName = sanitizeFilename(base);

    // Converte o stream legível em ReadableStream do Web
    const webStream = new ReadableStream({
      start(controller) {
        (pdfStream as any).on("data", (chunk: Buffer) => controller.enqueue(chunk));
        (pdfStream as any).on("end", () => controller.close());
        (pdfStream as any).on("error", (err: Error) => controller.error(err));
      },
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export-pdf] erro ao gerar PDF:", err);
    return new Response(
      JSON.stringify({ error: "Falha ao gerar PDF", detail: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
