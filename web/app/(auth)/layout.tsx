export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-emerald-800 to-black">
      <div className="grid min-h-dvh place-items-center px-6 py-10">
        {children}
      </div>
    </div>
  );
}
