"use client";

import { ActionItem } from "@/features/command-center/types";
import { Mail, Calendar, FileText, CheckSquare, MessageSquare } from "lucide-react";
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
  { id: "calendar", label: "Meetings" },
  { id: "document", label: "Docs" },
  { id: "approval", label: "Approvals" },
];

export function PriorityWorkFeed({
  items,
  activeFilter,
  setActiveFilter,
  selectedItem,
  setSelectedItem,
  isLoading
}: PriorityWorkFeedProps) {

  const getIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4 text-blue-500" />;
      case "calendar": return <Calendar className="h-4 w-4 text-purple-500" />;
      case "approval": return <CheckSquare className="h-4 w-4 text-amber-500" />;
      case "document": return <FileText className="h-4 w-4 text-emerald-500" />;
      default: return <MessageSquare className="h-4 w-4 text-zinc-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-900">Priority Work Feed</h2>
        <div className="flex items-center gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-full transition-colors",
                activeFilter === f.id 
                  ? "bg-zinc-900 text-white" 
                  : "bg-transparent text-zinc-600 hover:bg-zinc-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[400px]">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading work feed...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="h-10 w-10 text-green-500 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-medium text-zinc-900">No urgent items found.</h3>
            <p className="text-zinc-500">Your day looks clear.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map(item => (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={cn(
                  "p-4 cursor-pointer transition-colors hover:bg-zinc-50 flex items-center gap-4",
                  selectedItem?.id === item.id ? "bg-blue-50/50 border-l-2 border-l-blue-600 pl-[14px]" : "border-l-2 border-l-transparent"
                )}
              >
                <div className="p-2 bg-zinc-100 rounded-md shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{item.source || item.type}</span>
                      {item.priority === "high" && <Badge variant="destructive" className="h-4 text-[10px] px-1.5">High Priority</Badge>}
                    </div>
                    {item.timeLabel && <span className="text-xs text-zinc-500">{item.timeLabel}</span>}
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 truncate">{item.title}</h4>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">
                    {item.person ? <span className="font-medium text-zinc-800">{item.person} • </span> : null}
                    {item.description}
                  </p>
                </div>
                <div className="shrink-0 ml-4">
                  <Button size="sm" variant={selectedItem?.id === item.id ? "default" : "secondary"}>
                    {item.primaryActionLabel}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
