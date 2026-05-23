"use client";

import { useSession } from "@/features/session/hooks";
import { useMicrosoftStatus } from "@/features/auth/hooks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { data: session } = useSession();
  const { data: msStatus } = useMicrosoftStatus();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center justify-between md:justify-end gap-x-4 lg:gap-x-6">
        {/* Placeholder for page title on mobile, but handled by pages */}
        <div className="flex items-center gap-x-4">
          <Badge variant={process.env.NEXT_PUBLIC_APP_ENV === "production" ? "default" : "secondary"} className="hidden sm:inline-flex">
            {process.env.NEXT_PUBLIC_APP_ENV || "local"}
          </Badge>
          
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", msStatus?.connected ? "bg-green-500" : "bg-red-500")} title={msStatus?.connected ? "Microsoft 365 Connected" : "Microsoft 365 Disconnected"} />
            <span className="text-xs text-zinc-500 hidden sm:inline-block">
              {msStatus?.connected ? "M365 Connected" : "M365 Disconnected"}
            </span>
          </div>

          <div className="h-6 w-px bg-zinc-200" aria-hidden="true" />
          
          <div className="flex items-center gap-x-4">
            <span className="text-sm font-medium text-zinc-700 hidden md:block">
              {session?.status === "ok" ? session.workspace.name : "..."}
            </span>
            <div className="flex items-center">
              <Avatar className="h-8 w-8 bg-blue-100 text-blue-700">
                <AvatarFallback>
                  {session?.status === "ok" ? session.user.display_name.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="ml-2 text-sm font-medium text-zinc-700 hidden sm:block">
                {session?.status === "ok" ? session.user.display_name : "User"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
