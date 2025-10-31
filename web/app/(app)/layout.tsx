import HeaderNav from "./HeaderNav";
import RouteBg from "./RouteBg";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RouteBg>
      <div className="text-zinc-900">
        <HeaderNav />
        <main className="mx-auto min-h-[calc(100dvh-56px)] max-w-6xl px-6 py-6">{children}</main>
      </div>
    </RouteBg>
  );
}
 
