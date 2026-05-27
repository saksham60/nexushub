"use client";

import { Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMicrosoftStatus } from "@/features/auth/hooks";

export function ExecutiveTopRail() {
  const { data: microsoftStatus } = useMicrosoftStatus();
  const microsoftConnected = microsoftStatus?.connected === true;

  return (
    <header className="sticky top-0 z-40 w-full bg-transparent">
      <div className="flex h-16 items-center justify-end px-4 md:px-6 lg:px-8 gap-4 pt-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-0.5 w-3 h-3 mr-1">
            <div className="bg-[#00A4EF]"></div>
            <div className="bg-[#7FBA00]"></div>
            <div className="bg-[#F25022]"></div>
            <div className="bg-[#FFB900]"></div>
          </div>
          <span className="text-xs font-medium text-foreground mr-2">Microsoft 365</span>
          <span className={`h-2 w-2 rounded-full ${microsoftConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"}`} />
        </div>
      </div>
    </header>
  );
}
