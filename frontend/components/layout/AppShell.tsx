"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex h-screen w-full bg-zinc-50 text-zinc-950 overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        <TopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
