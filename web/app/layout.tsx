import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { InboxProvider } from "@/features/inbox/InboxDrawer";
import "react-day-picker/dist/style.css";

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: "MZNET - Sistema de Gestão",
  description: "Sistema de Gestão Inteligente MZNET",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${poppins.variable} dark`}>
      <body className={`${poppins.className} antialiased text-zinc-900 dark:text-zinc-100`} suppressHydrationWarning>
        {/* Provider global para Inbox + Toasts (realtime), disponível em todas as rotas */}
        <Suspense fallback={<>{children}</>}>
          <InboxProvider>
            {children}
          </InboxProvider>
        </Suspense>
      </body>
    </html>
  );
}
