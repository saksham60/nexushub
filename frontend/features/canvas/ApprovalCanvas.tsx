"use client";

import { useCanvas } from "./CanvasContext";
import { useApproveAction, useRejectAction } from "@/features/approvals/hooks";
import { normalizeApprovalId } from "@/features/approvals/ids";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, Scale, X } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { CanvasStatusBanner } from "./CanvasStatusBanner";

export function ApprovalCanvas() {
  const { actionItem, canvasPayload, closeCanvas } = useCanvas();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const metadata = (actionItem?.metadata || {}) as Record<string, unknown>;
  const payload = canvasPayload || {};
  const approvalId = normalizeApprovalId(
    metadata.id ||
      metadata.approval_id ||
      payload.approvalId ||
      payload.id ||
      actionItem?.id ||
      "",
  );
  const preview = metadata.preview && typeof metadata.preview === "object"
    ? metadata.preview as Record<string, unknown>
    : {};
  const title = actionItem?.title || String(preview.title || payload.title || "Approval request");
  const description =
    actionItem?.description ||
    String(preview.description || preview.body_preview || payload.preview || "Review this action before NexusHub executes it.");
  const isWorking = approveAction.isPending || rejectAction.isPending;
  const error = approveAction.error || rejectAction.error;

  return (
    <div className="flex h-full flex-col bg-background/50 p-6 text-foreground">
      <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Execution Canvas</p>
          <h2 className="mt-1 text-2xl font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Approval required before execution.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {getFriendlyErrorMessage(error)}
        </div>
      )}
      <CanvasStatusBanner status={payload.backendStatus} message={payload.backendError} />
      {(approveAction.isSuccess || rejectAction.isSuccess) && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          {approveAction.isSuccess ? "Approval executed." : "Approval rejected."}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Review Details</h3>
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{description}</p>
        {approvalId && (
          <p className="mt-5 text-xs text-muted-foreground">Approval ID: {approvalId}</p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
        <Button variant="ghost" onClick={closeCanvas} disabled={isWorking}>
          Dismiss
        </Button>
        <Button
          variant="outline"
          className="border-white/10 bg-white/5"
          disabled={!approvalId || isWorking}
          onClick={() => rejectAction.mutate(approvalId)}
        >
          <X className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!approvalId || isWorking}
          onClick={() => approveAction.mutate(approvalId)}
        >
          <Check className="mr-2 h-4 w-4" />
          {approveAction.isPending ? "Approving..." : "Approve & Execute"}
        </Button>
      </div>
    </div>
  );
}
