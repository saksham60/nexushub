"use client";

import { ExecutiveTopRail } from "../command-center/ExecutiveTopRail";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-zinc-50 text-zinc-950 overflow-hidden">
      <ExecutiveTopRail />
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
