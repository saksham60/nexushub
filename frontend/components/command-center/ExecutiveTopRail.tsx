"use client";

import { useSession } from "@/features/session/hooks";
import { useRouter } from "next/navigation";
import { LogOut, Settings, LayoutGrid, Server, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCommandCenterFeed } from "@/features/command-center/hooks/useActionQueue";

export function ExecutiveTopRail() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: feed, isError: feedError } = useCommandCenterFeed();
  const userName = session?.status === "ok" ? session.user.display_name : "User";
  const initials = userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const platformOk = !feedError && feed?.health.backend === "ok" && feed.health.mcp === "ok";
  const mailboxEmail = feed?.mailboxEmail || null;
  const microsoftConnected = feed?.health.microsoft === "connected";

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b border-zinc-200">
        <div className="flex h-16 items-center px-4 md:px-6 lg:px-8 max-w-7xl mx-auto justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-blue-600 rounded-md p-1.5 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-zinc-900 tracking-tight">NexusHub</span>
            </div>

            <div className={`hidden md:flex items-center gap-2 ml-4 border px-3 py-1 rounded-full ${
              platformOk ? "bg-green-50 border-green-100 text-green-800" : "bg-red-50 border-red-100 text-red-800"
            }`}>
              <Server className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {platformOk ? "Backend + MCP healthy" : "Service issue"}
              </span>
            </div>

            <div className={`hidden lg:flex items-center gap-2 border px-3 py-1 rounded-full min-w-0 ${
              microsoftConnected ? "bg-blue-50 border-blue-100 text-blue-800" : "bg-amber-50 border-amber-100 text-amber-800"
            }`}>
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate max-w-72">
                {mailboxEmail ? `Checking mailbox: ${mailboxEmail}` : "Microsoft 365 disconnected"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session?.status === "ok" && (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Avatar className="h-9 w-9 border border-zinc-200 hover:border-blue-300 transition-colors cursor-pointer">
                    <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.display_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{mailboxEmail || session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
