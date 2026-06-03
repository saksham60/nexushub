"use client";

import { useCanvas } from "./CanvasContext";
import { Calendar, Check, Clock, Users, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvasStatusBanner } from "./CanvasStatusBanner";
import { useApproveAction, useRejectAction } from "@/features/approvals/hooks";
import { normalizeApprovalId } from "@/features/approvals/ids";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function MeetingCanvas() {
  const { actionItem, canvasPayload, closeCanvas } = useCanvas();
  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const rawMetadata = {
    ...((actionItem?.metadata || {}) as Record<string, any>),
    ...((canvasPayload || {}) as Record<string, any>),
  };
  const preview = recordValue(rawMetadata.preview);
  const approvalPayload = recordValue(rawMetadata.payload);
  const argumentsPayload = recordValue(rawMetadata.arguments);
  const approval = recordValue(rawMetadata.approval);
  const metadata = {
    ...preview,
    ...argumentsPayload,
    ...approvalPayload,
    ...rawMetadata,
  };
  const attendees = firstStringList(metadata.attendees || metadata.to);
  const person = actionItem?.person || attendees[0] || "Unknown Attendee";
  const title = metadata.subject || metadata.title || actionItem?.title || "No Title";
  const approvalId = normalizeApprovalId(
    metadata.approvalId ||
      metadata.approval_id ||
      approval.id ||
      approval.approvalId ||
      approval.approval_id ||
      "",
  );
  const requiresApproval =
    Boolean(approvalId) ||
    metadata.status === "approval_required" ||
    String(metadata.actionType || "").startsWith("calendar.");
  const isWorking = approveAction.isPending || rejectAction.isPending;
  const actionError = approveAction.error || rejectAction.error;
  
  // Try to format dates from metadata if available
  let displayDate = "No date available";
  let displayTime = "";
  let displayEndTime = "";
  
  const rawStart = metadata.start?.dateTime || metadata.startTime || metadata.targetStartTime || metadata.newStart;
  const rawEnd = metadata.end?.dateTime || metadata.endTime || metadata.targetEndTime || metadata.newEnd;
  if (rawStart) {
    const d = new Date(rawStart);
    if (Number.isNaN(d.getTime())) {
      displayDate = String(rawStart);
    } else {
      displayDate = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      displayTime = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
  }
  if (rawEnd) {
    const d = new Date(rawEnd);
    if (!Number.isNaN(d.getTime())) {
      displayEndTime = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
  }
  const conflictWarning = recordValue(metadata.conflictWarning);

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Availability */}
      <div className="w-1/3 border-r border-white/10 p-6 flex flex-col bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Availability Check
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Availability Details</h4>
            <div className="space-y-4">
              {/* Attendee */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">{person}</span>
                  <span className="text-muted-foreground">Availability unknown</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full w-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          {conflictWarning.subject ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="text-sm">
                <p className="text-amber-500 font-medium mb-1">Calendar Conflict</p>
                <p className="text-muted-foreground">
                  {String(conflictWarning.subject)} overlaps this time.
                </p>
              </div>
            </div>
          ) : metadata.backendStatus === "preparing" ? (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
              <Clock className="h-5 w-5 text-blue-400 shrink-0" />
              <div className="text-sm">
                <p className="text-blue-300 font-medium mb-1">Calendar Check</p>
                <p className="text-muted-foreground">
                  Checking your calendar before creating the approval.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3">
              <Check className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="text-sm">
                <p className="text-emerald-500 font-medium mb-1">Calendar Check</p>
                <p className="text-muted-foreground">
                  No conflict was returned for your calendar.
                </p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-sm">
              <p className="text-amber-500 font-medium mb-1">Limited Data</p>
              <p className="text-muted-foreground">Free/busy API integration is required to show accurate availability.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Meeting Details */}
      <div className="w-2/3 p-6 flex flex-col h-full">
        <h2 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
          Meeting Details
        </h2>
        <CanvasStatusBanner status={metadata.backendStatus} message={metadata.backendError} />
        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{getFriendlyErrorMessage(actionError)}</span>
          </div>
        )}
        {requiresApproval && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-300">
            <Calendar className="h-4 w-4" />
            <span>
              Review required before NexusHub creates this Outlook calendar event.
              {approvalId ? ` Approval ID: ${approvalId}` : ""}
            </span>
          </div>
        )}

        <div className="flex-1 space-y-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Meeting Title</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                {title}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Date & Time</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {displayDate} {displayTime ? `at ${displayTime}` : ""}{displayEndTime ? ` - ${displayEndTime}` : ""}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Attendees</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex items-center gap-2 truncate">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{attendees.length ? attendees.join(", ") : `You, ${person}`}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Context / Agenda</label>
              <textarea 
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm min-h-[120px] resize-none focus:outline-none text-muted-foreground"
                value={actionItem?.description || "No agenda provided."}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" disabled={isWorking} onClick={closeCanvas}>
              Close
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 hover:bg-white/10"
                disabled={!approvalId || isWorking}
                onClick={() => rejectAction.mutate(approvalId, { onSuccess: closeCanvas })}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!approvalId || isWorking}
                onClick={() => approveAction.mutate(approvalId, { onSuccess: closeCanvas })}
              >
                <Check className="mr-2 h-4 w-4" />
                {approveAction.isPending ? "Scheduling..." : "Approve & Schedule"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function recordValue(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

function firstStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}
