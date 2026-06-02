"use client";

import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, Inbox, Calendar, FileText, Scale, Zap, ChevronLeft, ChevronRight, ChevronDown, Settings, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./MobileNav";
import { Sparkles } from "lucide-react";
import { useSession } from "@/features/session/hooks";
import { useMicrosoftStatus } from "@/features/auth/hooks";

const navItems = [
  { name: "Command Center", href: "/command-center", icon: Home },
  { name: "Mail", href: "/mail", icon: Inbox },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Doc Intelligence", href: "/doc-intelligence", icon: FileText },
  { name: "Approvals", href: "/approvals", icon: Scale },
  { name: "Automations", href: "/automations", icon: Zap },
  { name: "Knowledge Graph", href: "/knowledge", icon: Network },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { data: microsoftStatus } = useMicrosoftStatus();

  let userName = "Workspace User";
  let userDetail = "Microsoft 365 workspace";
  if (microsoftStatus?.connected && microsoftStatus.display_name) {
    userName = microsoftStatus.display_name;
    userDetail = microsoftStatus.email || "Connected account";
  } else if (session?.status === "ok" && session.user.display_name !== "Workspace User") {
    userName = session.user.display_name;
    userDetail = session.user.email;
  }
  
  const initials = userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <>
      <MobileNav items={navItems} />

      <div
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-background/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex h-20 items-center justify-between", sidebarCollapsed ? "px-2" : "px-5")}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-xl font-medium tracking-tight text-foreground">
                NexusHub
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex w-full items-center justify-between gap-1">
              <Sparkles className="h-6 w-6 text-primary" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {!sidebarCollapsed && (
            <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(true)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 scrollbar-none">
          <nav className="space-y-2 px-3">
            {navItems.map((item) => {
              const itemUrl = new URL(item.href, "http://localhost");
              const itemPath = itemUrl.pathname;
              const itemFilter = itemUrl.searchParams.get("filter");
              const currentFilter = searchParams?.get("filter");
              
              let isActive = false;
              if (pathname === itemPath) {
                if (itemFilter && currentFilter) {
                  isActive = itemFilter === currentFilter;
                } else if (!itemFilter && !currentFilter) {
                  isActive = true;
                } else if (itemPath === "/command-center" && !itemFilter && currentFilter === "all") {
                  isActive = true; // Fallback logic
                } else if (itemPath === "/command-center" && itemFilter === "all" && !currentFilter) {
                  isActive = true; // Home / Priorities mapping
                }
              }
              // Strict home match if nothing else
              if (item.name === "Home" && pathname === "/" && !currentFilter) isActive = true;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(139,92,246,0.15)] border border-primary/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-4 w-4", !sidebarCollapsed && "mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {!sidebarCollapsed && (
          <div className="px-4 py-4 mt-auto">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-2 h-2 bg-[#00A4EF]"></div>
                  <div className="w-2 h-2 bg-[#7FBA00]"></div>
                  <div className="w-2 h-2 bg-[#F25022]"></div>
                  <div className="w-2 h-2 bg-[#FFB900]"></div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Microsoft 365</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-4 gap-2 px-1">
              <div className="h-8 w-8 rounded-lg bg-[#0078D4]/10 flex items-center justify-center border border-[#0078D4]/20">
                <span className="text-[#0078D4] text-xs font-bold">O</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-[#464EB8]/10 flex items-center justify-center border border-[#464EB8]/20">
                <span className="text-[#464EB8] text-xs font-bold">T</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-[#2B579A]/10 flex items-center justify-center border border-[#2B579A]/20">
                <span className="text-[#2B579A] text-xs font-bold">W</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-[#217346]/10 flex items-center justify-center border border-[#217346]/20">
                <span className="text-[#217346] text-xs font-bold">X</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-[#B7472A]/10 flex items-center justify-center border border-[#B7472A]/20">
                <span className="text-[#B7472A] text-xs font-bold">P</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-[#7719AA]/10 flex items-center justify-center border border-[#7719AA]/20">
                <span className="text-[#7719AA] text-xs font-bold">N</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/10 mt-2">
          {sidebarCollapsed ? (
            <div className="flex justify-center cursor-pointer" onClick={() => setSidebarCollapsed(false)}>
              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">{initials}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between cursor-pointer group hover:bg-white/5 p-2 -m-2 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                  <span className="text-sm font-medium text-primary">{initials}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{userName}</span>
                  <span className="text-xs text-muted-foreground">{userDetail}</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
