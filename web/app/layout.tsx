import type { Metadata } from "next";
import "./globals.css";
import "react-day-picker/dist/style.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MZNET - Sistema de Gestão",
  description: "Sistema de Gestão Inteligente MZNET",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f6" },
    { media: "(prefers-color-scheme: dark)", color: "#050706" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className="bg-[var(--background)] text-[var(--foreground)] antialiased"
        suppressHydrationWarning
      >
        {/* Provider global para Inbox + Toasts (realtime), disponível em todas as rotas */}
        {children}
      </body>
    </html>
  );
}
