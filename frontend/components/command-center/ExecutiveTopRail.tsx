"use client";

import { useSession } from "@/features/session/hooks";
import { LogOut, Settings, LayoutGrid, Mail, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBackendHealth } from "@/features/health/hooks";
import { useMicrosoftStatus } from "@/features/auth/hooks";

export function ExecutiveTopRail() {
  const { data: session } = useSession();
  const { data: health } = useBackendHealth();
  const { data: microsoftStatus } = useMicrosoftStatus();
  const userName = session?.status === "ok" ? session.user.display_name : "User";
  const initials = userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const backendOk = health?.backend.status === "ok";
  const mcpOk = health?.dependencies.mcp?.status === "ok";
  const microsoftConnected = microsoftStatus?.connected === true;
  const connected = backendOk && mcpOk && microsoftConnected;
  const mailboxEmail = microsoftStatus?.connected ? microsoftStatus.email : null;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-blue-600 rounded-md p-1.5 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-zinc-900 tracking-tight">NexusHub</span>
            </div>

            <div
              title={`Backend ${backendOk ? "healthy" : "unavailable"} | MCP ${mcpOk ? "healthy" : "unavailable"} | Microsoft Graph ${microsoftConnected ? "connected" : "disconnected"}`}
              className={`ml-2 hidden items-center gap-2 rounded-full border px-3 py-1 md:flex ${
              connected ? "border-green-100 bg-green-50 text-green-800" : "border-amber-100 bg-amber-50 text-amber-800"
            }`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`} />
              <span className="text-xs font-medium">
                {connected ? "Connected" : "Needs attention"}
              </span>
            </div>

            <div className={`hidden min-w-0 items-center gap-2 rounded-full border px-3 py-1 lg:flex ${
              microsoftConnected ? "border-blue-100 bg-blue-50 text-blue-800" : "border-amber-100 bg-amber-50 text-amber-800"
            }`}>
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate max-w-72">
                {mailboxEmail ? `Mailbox: ${mailboxEmail}` : "Mailbox disconnected"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/settings" aria-label="Open settings" title="Settings">
              <Button variant="ghost" size="icon-lg" className="text-zinc-500 hover:text-zinc-900">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            {session?.status === "ok" && (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <div className="flex items-center gap-2 rounded-full px-1 py-0.5 transition-colors hover:bg-zinc-50">
                    <Avatar className="h-9 w-9 border border-zinc-200 hover:border-blue-300 transition-colors cursor-pointer">
                      <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.display_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{mailboxEmail || session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="font-normal">
                    <div className="space-y-1 text-xs text-zinc-500">
                      <p>Backend: {backendOk ? "healthy" : "unavailable"}</p>
                      <p>MCP: {mcpOk ? "healthy" : "unavailable"}</p>
                      <p>Microsoft Graph: {microsoftConnected ? "connected" : "disconnected"}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link
                    href="/settings"
                    className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-zinc-900 outline-none hover:bg-zinc-100 focus:bg-zinc-100"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
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
