"use client";

import { Sidebar } from "./Sidebar";
import { ExecutiveTopRail } from "../command-center/ExecutiveTopRail";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden pl-0 md:pl-64 transition-all duration-300">
        <ExecutiveTopRail />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background -z-10 pointer-events-none" />
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
