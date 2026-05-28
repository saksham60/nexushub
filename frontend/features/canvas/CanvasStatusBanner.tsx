"use client";

import { AlertCircle, Loader2 } from "lucide-react";

export function CanvasStatusBanner({
  status,
  message,
}: {
  status?: unknown;
  message?: unknown;
}) {
  if (status !== "preparing" && status !== "error") return null;

  const isError = status === "error";
  return (
    <div
      className={
        isError
          ? "mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
          : "mb-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary"
      }
    >
      {isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
      <span>
        {isError
          ? String(message || "Backend execution is unavailable. You can still review the prepared canvas.")
          : "Preparing backend execution context..."}
      </span>
    </div>
  );
}
