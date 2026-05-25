"use client";

import { ActionItem } from "@/features/command-center/types";
import {
  Calendar,
  CheckSquare,
  FileText,
  Mail,
  MessageSquare,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PriorityWorkFeedProps {
  items: ActionItem[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  selectedItem: ActionItem | null;
  setSelectedItem: (item: ActionItem) => void;
  isLoading?: boolean;
}

const filters = [
  { id: "all", label: "All" },
  { id: "email", label: "Email" },
  { id: "approval", label: "Approvals" },
  { id: "document", label: "Documents" },
  { id: "calendar", label: "Meetings" },
];

export function PriorityWorkFeed({
  items,
  activeFilter,
  setActiveFilter,
  selectedItem,
  setSelectedItem,
  isLoading,
}: PriorityWorkFeedProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-white px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Priority Work Feed</h2>
          <button className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
            All <span className="text-zinc-300">|</span> Filter <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeFilter === filter.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading work feed...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="mx-auto mb-3 h-10 w-10 text-green-500 opacity-50" />
            <h3 className="text-lg font-medium text-zinc-900">No urgent items found.</h3>
            <p className="text-zinc-500">Your day looks clear.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 border-l-2 p-3 text-left transition-colors hover:bg-zinc-50",
                  selectedItem?.id === item.id ? "border-l-blue-600 bg-blue-50/50" : "border-l-transparent",
                )}
              >
                <div className="shrink-0 rounded-lg bg-zinc-100 p-2">{getIcon(item.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-zinc-300">|</span>
                      <span className="text-[10px] font-medium text-zinc-400">{item.source || "NexusHub"}</span>
                    </div>
                    {item.timeLabel && <span className="text-xs text-zinc-500">{item.timeLabel}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-semibold text-zinc-900">{item.title}</h4>
                    <Badge
                      variant={item.priority === "high" ? "destructive" : "secondary"}
                      className="h-5 shrink-0 px-1.5 text-[10px] capitalize"
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-600">
                    {item.person ? <span className="font-medium text-zinc-800">{item.person} - </span> : null}
                    {item.description}
                  </p>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant={selectedItem?.id === item.id ? "default" : "outline"}
                    className={selectedItem?.id === item.id ? "" : "bg-white"}
                  >
                    {item.primaryActionLabel}
                  </Button>
                  <MoreVertical className="h-4 w-4 text-zinc-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "email":
      return <Mail className="h-4 w-4 text-blue-500" />;
    case "calendar":
      return <Calendar className="h-4 w-4 text-purple-500" />;
    case "approval":
      return <CheckSquare className="h-4 w-4 text-amber-500" />;
    case "document":
      return <FileText className="h-4 w-4 text-emerald-500" />;
    default:
      return <MessageSquare className="h-4 w-4 text-zinc-500" />;
  }
}
