"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";
import { RouteGuard } from "./RouteGuard";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <RouteGuard>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
