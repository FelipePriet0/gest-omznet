import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware de segurança: protege rotas de API que exigem autenticação.
 * A validação completa do JWT é feita no handler — aqui apenas bloqueamos
 * requisições sem nenhum cookie de sessão Supabase (defesa em profundidade).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proteger toda a árvore /api/export
  if (pathname.startsWith("/api/export")) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const hasAuthHeader = (req.headers.get("authorization") ?? "").startsWith("Bearer ");

    const hasSessionCookie = cookieHeader
      .split(";")
      .some((pair) => {
        const name = pair.slice(0, pair.indexOf("=")).trim();
        return name.startsWith("sb-") && name.endsWith("-auth-token");
      });

    if (!hasSessionCookie && !hasAuthHeader) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/export/:path*"],
};
