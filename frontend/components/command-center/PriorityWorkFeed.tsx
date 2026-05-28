"use client";

import { ActionItem } from "@/features/command-center/types";
import {
  Calendar,
  CheckSquare,
  FileText,
  Mail,
  Star,
  Users,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PriorityWorkFeedProps {
  items: ActionItem[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  selectedItem: ActionItem | null;
  setSelectedItem: (item: ActionItem) => void;
  isLoading?: boolean;
}

export function PriorityWorkFeed({
  items,
  selectedItem,
  setSelectedItem,
  isLoading,
}: PriorityWorkFeedProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground pl-1">Priority Work Feed</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-none">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading work feed...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-white/5 bg-card/30">
            <CheckSquare className="mx-auto mb-3 h-10 w-10 text-emerald-500/50" />
            <h3 className="text-lg font-medium text-foreground">No urgent items found.</h3>
            <p className="text-muted-foreground text-sm">Your day looks clear.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={cn(
                  "group flex w-full cursor-pointer items-center gap-4 rounded-xl p-3 text-left transition-all duration-300",
                  selectedItem?.id === item.id 
                    ? "bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]" 
                    : "bg-transparent border border-transparent hover:bg-white/5"
                )}
              >
                <div className="shrink-0 rounded-full h-8 w-8 flex items-center justify-center bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="truncate text-sm font-medium text-foreground">{item.title}</h4>
                    <Badge
                      className={cn(
                        "h-4 px-1.5 text-[9px] uppercase tracking-wider bg-transparent border",
                        item.priority === "high" ? "text-purple-400 border-purple-400/30 bg-purple-400/10" : 
                        item.priority === "medium" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" : 
                        "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                      )}
                    >
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.person ? <span className="font-medium text-zinc-300">{item.person}</span> : null}
                    {item.person && item.description ? " • " : ""}
                    {item.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {item.timeLabel && <span className="text-xs text-muted-foreground font-mono">{item.timeLabel}</span>}
                  <div className="h-6 w-6 rounded bg-white/5 flex items-center justify-center border border-white/10">
                    {getAppIcon(item.source)}
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" />
                </div>
              </button>
            ))}
            <div className="pt-2 pl-2">
              <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                View all priorities <ChevronRight className="inline h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "email": return <Mail className="h-4 w-4 text-blue-400" />;
    case "calendar": return <Calendar className="h-4 w-4 text-purple-400" />;
    case "approval": return <CheckSquare className="h-4 w-4 text-emerald-400" />;
    case "document": return <FileText className="h-4 w-4 text-blue-400" />;
    case "team": return <Users className="h-4 w-4 text-indigo-400" />;
    default: return <Star className="h-4 w-4 text-orange-400" />;
  }
}

function getAppIcon(source: string | undefined) {
  const s = (source || "").toLowerCase();
  if (s.includes("teams")) return <span className="text-[#464EB8] text-[10px] font-bold">T</span>;
  if (s.includes("outlook") || s.includes("mail")) return <span className="text-[#0078D4] text-[10px] font-bold">O</span>;
  if (s.includes("word") || s.includes("document")) return <span className="text-[#2B579A] text-[10px] font-bold">W</span>;
  if (s.includes("powerpoint")) return <span className="text-[#B7472A] text-[10px] font-bold">P</span>;
  if (s.includes("excel")) return <span className="text-[#217346] text-[10px] font-bold">X</span>;
  return <span className="text-muted-foreground text-[10px] font-bold">N</span>;
}
