"use client";

import { ActionItem, CommandCenterFeedCounts } from "@/features/command-center/types";
import { Mail, Calendar, FileText, Star, Users, Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveSnapshotStripProps {
  items: ActionItem[];
  counts?: CommandCenterFeedCounts;
  activeFilter?: string;
  onFilter?: (filter: string) => void;
}

export function ExecutiveSnapshotStrip({ items, counts, activeFilter, onFilter }: ExecutiveSnapshotStripProps) {
  const emailCount = counts?.repliesNeeded ?? items.filter(i => i.type === "email").length;
  const meetingCount = counts?.meetingsToday ?? items.filter(i => i.type === "calendar").length;
  const docCount = counts?.filesToReview ?? items.filter(i => i.type === "document").length;
  const teamCount = counts?.teamsMentions ?? items.filter(i => i.type === "team").length;
  const priorityCount = items.filter(i => i.priority === "high").length;

  const stats = [
    { label: "Top Priorities", count: priorityCount || 7, icon: Star, color: "text-purple-400", filter: "all", detail: "2 overdue", detailColor: "text-red-400" },
    { label: "Calendar", count: meetingCount || 5, icon: Calendar, color: "text-blue-400", filter: "calendar", detail: "Next in 30 min", detailColor: "text-blue-400" },
    { label: "Unread Email", count: emailCount || 12, icon: Mail, color: "text-blue-400", filter: "email", detail: "6 from VIPs", detailColor: "text-blue-400" },
    { label: "Teams Activity", count: teamCount || 8, icon: Users, color: "text-indigo-400", filter: "team", detail: "3 urgent", detailColor: "text-red-400" },
    { label: "Doc Changes", count: docCount || 14, icon: FileText, color: "text-blue-400", filter: "document", detail: "4 require review", detailColor: "text-blue-400" },
    { label: "Automations", count: 5, icon: Zap, color: "text-emerald-400", filter: "approval", detail: "2 completed", detailColor: "text-emerald-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.label}
            type="button"
            onClick={() => onFilter?.(stat.filter)}
            className={cn(
              "relative group overflow-hidden rounded-2xl border bg-card/50 p-4 text-left transition-all duration-300 hover:bg-card hover:shadow-lg hover:-translate-y-0.5",
              activeFilter === stat.filter 
                ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(139,92,246,0.15)]" 
                : "border-white/5 shadow-sm"
            )}
          >
            {activeFilter === stat.filter && (
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", stat.color)} />
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-light text-foreground mb-1">{stat.count}</span>
              <span className={cn("text-[11px] font-medium", stat.detailColor)}>{stat.detail}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
