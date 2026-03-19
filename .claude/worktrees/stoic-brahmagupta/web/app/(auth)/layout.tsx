import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - MZNET",
  description: "Acesse sua conta MZNET",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}