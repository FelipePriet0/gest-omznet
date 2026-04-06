import { Suspense } from "react";
import { AppLayoutClient } from "./AppLayoutClient";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div />}>
      <AppLayoutClient>{children}</AppLayoutClient>
    </Suspense>
  );
}
