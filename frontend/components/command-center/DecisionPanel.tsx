"use client";

import { ActionItem } from "@/features/command-center/types";
import { Button } from "@/components/ui/button";
import { Sparkles, Scale, Check, X, AlertCircle } from "lucide-react";
import { useApproveAction, useRejectAction } from "@/features/approvals/hooks";
import { normalizeApprovalId } from "@/features/approvals/ids";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/features/canvas/CanvasContext";

interface DecisionPanelProps {
  item: ActionItem | null;
}

export function DecisionPanel({ item }: DecisionPanelProps) {
  const { openCanvas } = useCanvas();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 border border-white/10 rounded-2xl bg-card/30">
        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
          <Scale className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Select an item</h3>
        <p className="text-sm text-muted-foreground max-w-[200px]">
          Choose an item from the priority feed to view details and take action.
        </p>
      </div>
    );
  }

  const isApproval = item.type === "approval";
  const approvalId = normalizeApprovalId(item.metadata?.id || item.metadata?.approval_id || item.id);

  const handleApprove = async () => {
    try {
      await approveAction.mutateAsync(approvalId);
    } catch {
      // Error is handled by global query hooks, but could show local state
    }
  };

  const handleReject = async () => {
    await rejectAction.mutateAsync(approvalId);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/50 shadow-2xl backdrop-blur-sm">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-white/10">
            {item.type}
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
            item.priority === "high" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-white/5 text-muted-foreground border-white/10"
          )}>
            {item.priority}
          </span>
        </div>
        <h3 className="text-lg font-medium text-foreground">{item.title}</h3>
        {item.person && <p className="text-xs text-muted-foreground mt-1">From: {item.person}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-none space-y-4">
        {(approveAction.isError || rejectAction.isError) && (
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex gap-2 items-center">
            <AlertCircle className="h-4 w-4" />
            <span>{getFriendlyErrorMessage(approveAction.error || rejectAction.error)}</span>
          </div>
        )}
        
        <section className="bg-white/5 rounded-xl border border-white/10 p-4">
          <h4 className="mb-2 text-xs font-semibold text-primary flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> AI Summary
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {item.description || "NexusHub selected this item because it needs your attention."}
          </p>
        </section>

        {isApproval ? (
          <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
            <Button
              variant="outline"
              disabled={approveAction.isPending || rejectAction.isPending}
              className="bg-white/5 border-white/10 text-foreground hover:bg-white/10"
              onClick={() => openCanvas("approval", item, item.metadata || {})}
            >
              Review
            </Button>
            <Button 
              variant="outline"
              disabled={approveAction.isPending || rejectAction.isPending}
              className="bg-transparent border-white/10 text-muted-foreground hover:text-white"
              onClick={handleReject}
            >
              <X className="mr-2 h-4 w-4" />
              {rejectAction.isPending ? "Rejecting..." : "Reject"}
            </Button>
            <Button 
              disabled={approveAction.isPending || rejectAction.isPending}
              className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30"
              onClick={handleApprove}
            >
              <Check className="mr-2 h-4 w-4" />
              {approveAction.isPending ? "Approving..." : "Approve"}
            </Button>
          </div>
        ) : (
          <div className="pt-4">
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(139,92,246,0.3)] h-12 rounded-xl text-base" 
              onClick={() => {
                if (item.type === "email") openCanvas("email", item);
                else if (item.type === "calendar") openCanvas("meeting", item);
                else if (item.type === "document") openCanvas("document", item);
                else if (item.type === "report" || item.type === "automation") openCanvas("automation", item, item.metadata || {});
              }}
            >
              <Scale className="mr-2 h-5 w-5" />
              Take Action
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
