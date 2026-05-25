"use client";

import { ActionItem, CommandCenterFeedCounts } from "@/features/command-center/types";
import { Mail, Calendar, FileText, CheckSquare, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  const approvalCount = counts?.approvalsPending ?? items.filter(i => i.type === "approval").length;
  const docCount = counts?.filesToReview ?? items.filter(i => i.type === "document").length;
  const suggestionCount = counts?.aiSuggestions ?? 0;

  const stats = [
    { label: "Replies Needed", count: emailCount, icon: Mail, color: "text-blue-600", bg: "bg-blue-50", filter: "email", detail: emailCount ? "Needs reply" : "All clear" },
    { label: "Meetings Today", count: meetingCount, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50", filter: "calendar", detail: meetingCount ? "Prepare brief" : "No meetings" },
    { label: "Approvals Pending", count: approvalCount, icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50", filter: "approval", detail: approvalCount ? "Review needed" : "All clear" },
    { label: "Files to Review", count: docCount, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50", filter: "document", detail: docCount ? "Ready" : "None" },
    { label: "AI Suggestions", count: suggestionCount, icon: Sparkles, color: "text-indigo-600", bg: "bg-indigo-50", filter: "all", detail: suggestionCount ? "Actionable" : "Quiet" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className={cn(
              "border-zinc-200 p-0 shadow-sm transition-all hover:border-blue-200 hover:shadow-md",
              activeFilter === stat.filter && "border-blue-200 bg-blue-50/40"
            )}
          >
            <button type="button" onClick={() => onFilter?.(stat.filter)} className="w-full p-3 text-left">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold leading-none text-zinc-900">{stat.count}</p>
                <p className="mt-1 truncate text-xs font-medium text-zinc-500">{stat.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-400">{stat.detail}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </div>
            </button>
          </Card>
        );
      })}
    </div>
  );
}
