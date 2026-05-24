"use client";

import { ActionItem, CommandCenterFeedCounts } from "@/features/command-center/types";
import { Mail, Calendar, FileText, CheckSquare, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ExecutiveSnapshotStripProps {
  items: ActionItem[];
  counts?: CommandCenterFeedCounts;
}

export function ExecutiveSnapshotStrip({ items, counts }: ExecutiveSnapshotStripProps) {
  const emailCount = counts?.repliesNeeded ?? items.filter(i => i.type === "email").length;
  const meetingCount = counts?.meetingsToday ?? items.filter(i => i.type === "calendar").length;
  const approvalCount = counts?.approvalsPending ?? items.filter(i => i.type === "approval").length;
  const docCount = counts?.filesToReview ?? items.filter(i => i.type === "document").length;
  const suggestionCount = 3; // Placeholder for AI suggestions logic if needed

  const stats = [
    { label: "Replies Needed", count: emailCount, icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Meetings Today", count: meetingCount, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Approvals Pending", count: approvalCount, icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Files to Review", count: docCount, icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "AI Suggestions", count: suggestionCount, icon: Sparkles, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="p-4 border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900 leading-none">{stat.count}</p>
                <p className="text-xs text-zinc-500 font-medium mt-1">{stat.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
