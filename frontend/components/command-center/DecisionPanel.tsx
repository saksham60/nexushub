"use client";

import { ActionItem } from "@/features/command-center/types";
import { Button } from "@/components/ui/button";
import { Check, Calendar } from "lucide-react";
import { useApproveAction } from "@/features/approvals/hooks";

interface DecisionPanelProps {
  item: ActionItem | null;
}

export function DecisionPanel({ item }: DecisionPanelProps) {
  const approveAction = useApproveAction();

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed">
        <p className="text-zinc-500">Select an item from the feed to view details and take action.</p>
      </div>
    );
  }

  const handleAction = () => {
    if (item.type === "approval") {
      approveAction.mutate(item.id.replace("app_", ""));
    }
    // Implement other actions directly
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden sticky top-24">
      <div className="px-6 py-5 border-b border-zinc-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {item.type}
          </span>
          {item.priority === "high" && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              High Priority
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 leading-tight">{item.title}</h2>
        {item.person && <p className="text-sm text-zinc-500 mt-1">From: <span className="font-medium text-zinc-700">{item.person}</span></p>}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">AI Summary</h3>
          <p className="text-sm text-zinc-800 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
            {item.description || "No summary available for this item."}
          </p>
        </div>

        {item.type === "calendar" && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Meeting Details</h3>
            <div className="flex items-center gap-2 text-sm text-zinc-700 mb-1">
              <Calendar className="h-4 w-4" /> {item.timeLabel}
            </div>
            {item.originalItem?.preparation_notes?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-zinc-800 mb-1">Preparation Notes:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600">
                  {item.originalItem.preparation_notes.map((note: string, idx: number) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {item.type === "email" && item.originalItem?.reason && (
          <div>
             <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Why this matters</h3>
             <p className="text-sm text-zinc-700">{item.originalItem.reason}</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-100 bg-zinc-50">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Suggested Action</h3>
        <div className="flex flex-col gap-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            size="lg"
            onClick={handleAction}
            disabled={approveAction.isPending && item.type === "approval"}
          >
            <Check className="h-4 w-4 mr-2" />
            {item.type === "approval" && approveAction.isPending ? "Approving..." : item.primaryActionLabel}
          </Button>
          
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-white">
              Edit Draft
            </Button>
            <Button variant="outline" className="flex-1 bg-white text-zinc-500 hover:text-red-600">
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
