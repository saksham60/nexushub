"use client";

import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mail, Calendar, Users, FileText, CheckSquare, Settings, Menu, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./MobileNav";

const navItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Mail Pilot", href: "/mail", icon: Mail },
  { name: "DayPilot", href: "/calendar", icon: Calendar },
  { name: "TeamSpace", href: "/teams", icon: Users },
  { name: "Doc Insights", href: "/docs", icon: FileText },
  { name: "Approvals", href: "/approvals", icon: CheckSquare },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Sidebar */}
      <MobileNav items={navItems} />

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-white border-r border-zinc-200 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-200">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              NexusHub
            </span>
          )}
          {sidebarCollapsed && (
            <div className="w-full flex justify-center">
              <span className="text-xl font-bold text-blue-600">N</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5", !sidebarCollapsed && "mr-3", isActive ? "text-blue-700" : "text-zinc-400")} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-zinc-200 p-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full flex items-center text-zinc-500", sidebarCollapsed ? "justify-center" : "justify-start")}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <><ChevronLeft className="mr-2 h-5 w-5" /> Collapse Sidebar</>}
          </Button>
        </div>
      </div>
    </>
  );
}
