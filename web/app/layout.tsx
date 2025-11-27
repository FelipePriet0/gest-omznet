import type { Metadata } from "next";
import "./globals.css";
import "react-day-picker/dist/style.css";

export const metadata: Metadata = {
  title: "MZNET - Sistema de Gestão",
  description: "Sistema de Gestão Inteligente MZNET",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`dark`}>
      <body className={`antialiased text-zinc-900 dark:text-zinc-100`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
