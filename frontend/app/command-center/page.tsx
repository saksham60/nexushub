"use client";

import { useState } from "react";
import { useActionQueue } from "@/features/command-center/hooks/useActionQueue";
import { MorningBrief } from "@/components/command-center/MorningBrief";
import { ExecutiveSnapshotStrip } from "@/components/command-center/ExecutiveSnapshotStrip";
import { PriorityWorkFeed } from "@/components/command-center/PriorityWorkFeed";
import { DecisionPanel } from "@/components/command-center/DecisionPanel";
import { CommandCenterActionHub } from "@/components/command-center/CommandCenterActionHub";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { AgentChatResponse } from "@/features/agent/types";
import { useSendAgentMessage } from "@/features/agent/hooks";
import { Button } from "@/components/ui/button";

export default function CommandCenterPage() {
  const [agentResponse, setAgentResponse] = useState<AgentChatResponse | null>(null);
  const sendAgentMessage = useSendAgentMessage();
  const { 
    items, 
    filteredItems, 
    counts,
    topInsight,
    health,
    sourceErrors,
    isLoading, 
    isError, 
    errorMessage,
    activeFilter, 
    setActiveFilter, 
    selectedItem, 
    setSelectedItem 
  } = useActionQueue();
  const statusBanner = getStatusBanner({
    backendUnavailable: !health && isError,
    mcpStatus: health?.mcp,
    mcpError: sourceErrors.mcp || getMcpSourceError(sourceErrors),
    microsoftStatus: health?.microsoft,
    activityError: isError ? errorMessage : null,
  });

  const runPrompt = async (text: string) => {
    const response = await sendAgentMessage.mutateAsync({ message: text });
    setAgentResponse(response);
    return response;
  };

  return (
    <div className="animate-in fade-in space-y-4 pb-10 duration-500">
      {statusBanner && (
        <div className={`${statusBanner.className} px-4 py-3 rounded-lg flex items-center gap-3 text-sm border`}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{statusBanner.message}</p>
        </div>
      )}

      <MorningBrief
        onRunPrompt={runPrompt}
        agentResponse={agentResponse}
        isSubmittingPrompt={sendAgentMessage.isPending}
      />

      <TopInsightCard
        title={topInsight?.title}
        description={topInsight?.description}
      />

      <ExecutiveSnapshotStrip
        items={items}
        counts={counts}
        activeFilter={activeFilter}
        onFilter={setActiveFilter}
      />

      <div id="work-feed" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-7">
          <div className="h-[520px] min-h-[440px]">
            <PriorityWorkFeed 
              items={filteredItems}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-5">
          <div className="h-[520px] min-h-[440px]">
            <DecisionPanel item={selectedItem} />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <CommandCenterActionHub onRunPrompt={runPrompt} />
      </div>
    </div>
  );
}

function TopInsightCard({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Top Insight</p>
            <h2 className="truncate text-sm font-semibold text-zinc-900">
              {title || "Your executive brief is ready."}
            </h2>
            {description && <p className="truncate text-xs text-zinc-500">{description}</p>}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 text-blue-700">
          View details <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

function getStatusBanner({
  backendUnavailable,
  mcpStatus,
  mcpError,
  microsoftStatus,
  activityError,
}: {
  backendUnavailable: boolean;
  mcpStatus?: string;
  mcpError?: string;
  microsoftStatus?: string;
  activityError?: string | null;
}) {
  if (backendUnavailable) {
    return {
      className: "bg-red-50 text-red-800 border-red-200",
      message: "Backend is unreachable. Start NexusHub backend and try again.",
    };
  }
  if (mcpStatus && mcpStatus !== "ok") {
    const isPartial = mcpStatus === "partial";
    return {
      className: isPartial
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-red-50 text-red-800 border-red-200",
      message: `MCP is ${mcpStatus}. ${mcpError || "Backend cannot reach the MCP health API."}`,
    };
  }
  if (microsoftStatus === "disconnected") {
    return {
      className: "bg-amber-50 text-amber-800 border-amber-200",
      message: "Microsoft 365 is not connected. Connect an account to load Outlook, Calendar, and OneDrive activity.",
    };
  }
  if (microsoftStatus === "error") {
    return {
      className: "bg-red-50 text-red-800 border-red-200",
      message: "Microsoft Graph activity failed. Check the Microsoft connection and try again.",
    };
  }
  if (activityError) {
    return {
      className: "bg-red-50 text-red-800 border-red-200",
      message: `Microsoft Graph activity failed. ${activityError}`,
    };
  }
  return null;
}

function getMcpSourceError(sourceErrors: Record<string, string>) {
  const entries = Object.entries(sourceErrors).filter(([source]) =>
    ["mail", "calendar", "documents"].includes(source),
  );
  if (!entries.length) return undefined;
  return entries
    .map(([source, message]) => `${source[0].toUpperCase()}${source.slice(1)} source failed: ${message}`)
    .join(" ");
}
