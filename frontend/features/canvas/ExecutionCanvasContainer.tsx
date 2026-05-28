"use client";

import { useCanvas } from "./CanvasContext";
import { Maximize2, Minus, Sparkles, X } from "lucide-react";
import { EmailCanvas } from "./EmailCanvas";
import { MeetingCanvas } from "./MeetingCanvas";
import { DocumentCanvas } from "./DocumentCanvas";
import { ApprovalCanvas } from "./ApprovalCanvas";
import { AutomationCanvas } from "./AutomationCanvas";

export function ExecutionCanvasContainer() {
  const {
    activeCanvas,
    actionItem,
    isCanvasMinimized,
    closeCanvas,
    minimizeCanvas,
    restoreCanvas,
  } = useCanvas();

  if (!activeCanvas) return null;

  const canvasTitle = actionItem?.title || canvasTypeLabel(activeCanvas);

  if (isCanvasMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[110] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-primary/30 bg-card/95 p-2 text-foreground shadow-2xl shadow-primary/10 backdrop-blur-xl md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={restoreCanvas}
          className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
          aria-label={`Restore ${canvasTitle}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wider text-primary">Execution Canvas</span>
            <span className="block max-w-[240px] truncate text-sm font-medium text-foreground">{canvasTitle}</span>
          </span>
          <Maximize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={closeCanvas}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          aria-label="Close execution canvas"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl shadow-primary/10 animate-in zoom-in-95 duration-200">
        
        {/* Header rail */}
        <div className="absolute right-0 top-0 z-10 flex gap-2 p-4">
          <button
            type="button"
            onClick={minimizeCanvas}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-muted-foreground backdrop-blur-md transition-all hover:bg-black/60 hover:text-foreground"
            aria-label="Collapse execution canvas"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={closeCanvas}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-muted-foreground backdrop-blur-md transition-all hover:bg-black/60 hover:text-foreground"
            aria-label="Close execution canvas"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden h-full">
          {activeCanvas === "email" && <EmailCanvas />}
          {activeCanvas === "meeting" && <MeetingCanvas />}
          {activeCanvas === "document" && <DocumentCanvas />}
          {activeCanvas === "approval" && <ApprovalCanvas />}
          {activeCanvas === "automation" && <AutomationCanvas />}
        </div>
      </div>
    </div>
  );
}

function canvasTypeLabel(type: NonNullable<ReturnType<typeof useCanvas>["activeCanvas"]>) {
  if (type === "email") return "Compose Email";
  if (type === "meeting") return "Schedule Meeting";
  if (type === "document") return "Document Intelligence";
  if (type === "approval") return "Approval Review";
  return "Automation";
}
