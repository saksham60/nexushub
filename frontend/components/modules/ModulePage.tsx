"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Calendar, ChevronRight, FileText, Mail, Scale, Zap } from "lucide-react";
import { useCommandCenterFeed } from "@/features/command-center/hooks/useActionQueue";
import { ActionItem, ActionItemType } from "@/features/command-center/types";
import { useCanvas } from "@/features/canvas/CanvasContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModulePageProps = {
  title: string;
  description: string;
  filter?: ActionItemType | "all";
  icon: "mail" | "meeting" | "document" | "approval" | "automation";
  emptyTitle: string;
  emptyDescription: string;
  children?: ReactNode;
};

export function ModulePage({
  title,
  description,
  filter = "all",
  icon,
  emptyTitle,
  emptyDescription,
  children,
}: ModulePageProps) {
  const feed = useCommandCenterFeed();
  const { openCanvas } = useCanvas();
  const items = (feed.data?.items || []).filter((item) => filter === "all" || item.type === filter);
  const health = feed.data?.health;
  const degraded = feed.isError || health?.mcp === "error" || health?.mcp === "partial";
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            {moduleIcon(icon)}
          </div>
          <h1 className="text-3xl font-medium tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href="/command-center">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            Open Command Center
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </header>

      {degraded && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertCircle className="h-4 w-4" />
          Some live workspace data is unavailable. Start the backend and MCP server to load current items.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Live Items" value={feed.isLoading ? "--" : String(items.length)} />
        <SummaryTile label="Microsoft" value={health?.microsoft || "unknown"} />
        <SummaryTile label="MCP" value={health?.mcp || "unknown"} />
      </section>

      {children}

      <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Actionable Items</h2>
          <span className="text-xs text-muted-foreground">{items.length} loaded</span>
        </div>

        {feed.isLoading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
            Loading workspace items...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <h3 className="text-base font-medium text-foreground">{emptyTitle}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openActionCanvas(item, openCanvas)}
                className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <ItemIcon item={item} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.description || item.source}</p>
                </div>
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] uppercase",
                  item.priority === "high"
                    ? "border-red-400/30 bg-red-400/10 text-red-300"
                    : item.priority === "medium"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
                )}>
                  {item.priority}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-light capitalize text-foreground">{value}</p>
    </div>
  );
}

function moduleIcon(icon: ModulePageProps["icon"]) {
  if (icon === "mail") return <Mail className="h-5 w-5" />;
  if (icon === "meeting") return <Calendar className="h-5 w-5" />;
  if (icon === "document") return <FileText className="h-5 w-5" />;
  if (icon === "approval") return <Scale className="h-5 w-5" />;
  return <Zap className="h-5 w-5" />;
}

function ItemIcon({ item }: { item: ActionItem }) {
  if (item.type === "email") return <Mail className="h-4 w-4 text-blue-400" />;
  if (item.type === "calendar") return <Calendar className="h-4 w-4 text-purple-400" />;
  if (item.type === "document") return <FileText className="h-4 w-4 text-blue-400" />;
  if (item.type === "approval") return <Scale className="h-4 w-4 text-primary" />;
  return <Zap className="h-4 w-4 text-emerald-400" />;
}

function openActionCanvas(
  item: ActionItem,
  openCanvas: ReturnType<typeof useCanvas>["openCanvas"],
) {
  if (item.type === "email") openCanvas("email", item);
  else if (item.type === "calendar") openCanvas("meeting", item);
  else if (item.type === "document") openCanvas("document", item);
  else if (item.type === "approval") openCanvas("approval", item, item.metadata || {});
  else if (item.type === "report" || item.type === "automation") {
    openCanvas("automation", item, item.metadata || {});
  }
}
