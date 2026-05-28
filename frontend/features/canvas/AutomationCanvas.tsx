"use client";

import { useCanvas } from "./CanvasContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, Zap } from "lucide-react";
import { CanvasStatusBanner } from "./CanvasStatusBanner";

export function AutomationCanvas() {
  const { actionItem, canvasPayload, closeCanvas } = useCanvas();
  const title = actionItem?.title || String(canvasPayload?.title || "Automation");
  const description =
    actionItem?.description ||
    String(canvasPayload?.description || "Review this automation before enabling or running it.");

  return (
    <div className="flex h-full flex-col bg-background/50 p-6 text-foreground">
      <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Execution Canvas</p>
          <h2 className="mt-1 text-2xl font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Automation review and run status.</p>
        </div>
      </div>
      <CanvasStatusBanner status={canvasPayload?.backendStatus} message={canvasPayload?.backendError} />

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Automation Scope</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Status</h3>
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Ready for backend run-history integration
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
        <Button variant="ghost" onClick={closeCanvas}>
          Dismiss
        </Button>
        <Button disabled className="bg-primary text-primary-foreground">
          <Play className="mr-2 h-4 w-4" />
          Run Automation
        </Button>
      </div>
    </div>
  );
}
