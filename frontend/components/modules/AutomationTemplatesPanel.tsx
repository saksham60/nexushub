"use client";

import { useAutomations } from "@/features/automations/hooks";
import { Zap } from "lucide-react";

export function AutomationTemplatesPanel() {
  const automations = useAutomations();
  const templates = automations.data?.templates || [];

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Automation Templates</h2>
        <span className="text-xs text-muted-foreground">
          {automations.isLoading ? "Loading" : `${templates.length} available`}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {automations.isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
          ))
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground md:col-span-5">
            No automation templates are available from the backend.
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-foreground">{template.name}</p>
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{template.description}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
