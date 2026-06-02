"use client";

import { useState } from "react";
import { useActionQueue } from "@/features/command-center/hooks/useActionQueue";
import { ExecutiveSnapshotStrip } from "@/components/command-center/ExecutiveSnapshotStrip";
import { PriorityWorkFeed } from "@/components/command-center/PriorityWorkFeed";
import { DecisionPanel } from "@/components/command-center/DecisionPanel";
import { KnowledgeGraphWidget } from "@/features/knowledge/components/KnowledgeGraphWidget";
import { AlertCircle, Sparkles, Send } from "lucide-react";
import { AgentChatResponse } from "@/features/agent/types";
import { useSendAgentMessage } from "@/features/agent/hooks";
import { clearAgentConversationId } from "@/features/agent/conversation";
import { canvasRequestFromAgentResponse, inferCanvasFromPrompt } from "@/features/agent/executionCanvas";
import { AgentResponsePanel } from "@/components/agent/AgentResponsePanel";
import { useConnectMicrosoft, useMicrosoftStatus } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCanvas } from "@/features/canvas/CanvasContext";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export default function CommandCenterPage() {
  const [agentResponse, setAgentResponse] = useState<AgentChatResponse | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const sendAgentMessage = useSendAgentMessage();
  const connectMicrosoft = useConnectMicrosoft();
  const { data: microsoftStatus } = useMicrosoftStatus();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openCanvas } = useCanvas();
  
  let userName: string | null = null;
  if (microsoftStatus?.connected && microsoftStatus.display_name) {
    userName = microsoftStatus.display_name.split(" ")[0];
  }

  const initialFilter = searchParams?.get("filter") || "all";

  const { 
    items, 
    filteredItems, 
    counts,
    health,
    sourceErrors,
    isLoading, 
    isError, 
    errorMessage,
    activeFilter, 
    setActiveFilter, 
    selectedItem, 
    setSelectedItem 
  } = useActionQueue(initialFilter);

  useEffect(() => {
    const filter = searchParams?.get("filter") || "all";
    if (filter !== activeFilter) {
      setActiveFilter(filter);
    }
  }, [searchParams, activeFilter, setActiveFilter]);

  const handleFilterChange = (newFilter: string) => {
    setActiveFilter(newFilter);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("filter", newFilter);
    router.replace(`${pathname}?${params.toString()}`);
  };
  
  const statusBanner = getStatusBanner({
    backendUnavailable: !health && isError,
    mcpStatus: health?.mcp,
    mcpError: sourceErrors.mcp || getMcpSourceError(sourceErrors),
    microsoftStatus: health?.microsoft,
    activityError: isError ? errorMessage : null,
  });

  const runPrompt = async (text: string) => {
    const prompt = text.trim();
    if (!prompt) return;
    const inferredCanvas = inferCanvasFromPrompt(prompt, { backendStatus: "preparing" });
    if (inferredCanvas) {
      openCanvas(inferredCanvas.type, inferredCanvas.item, inferredCanvas.payload);
    }
    try {
      const response = await sendAgentMessage.mutateAsync({ message: prompt });
      setAgentResponse(response);
      const responseCanvas = canvasRequestFromAgentResponse(response, prompt);
      if (responseCanvas) {
        openCanvas(responseCanvas.type, responseCanvas.item, responseCanvas.payload);
      }
      setPromptInput("");
      return response;
    } catch (error) {
      const fallbackCanvas = inferCanvasFromPrompt(prompt, {
        backendStatus: "error",
        backendError: getFriendlyErrorMessage(error),
      });
      if (fallbackCanvas) {
        openCanvas(fallbackCanvas.type, fallbackCanvas.item, fallbackCanvas.payload);
      }
      return undefined;
    }
  };

  return (
    <div className="animate-in fade-in space-y-8 pb-10 duration-500 max-w-6xl mx-auto pt-6">
      {statusBanner && (
        <div className={`${statusBanner.className} rounded-xl border px-4 py-3 text-sm backdrop-blur-md`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{statusBanner.message}</p>
            </div>
            {statusBanner.action === "connect_microsoft" && (
              <Button
                size="sm"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                onClick={() => connectMicrosoft()}
              >
                Connect Microsoft 365
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Greeting Section */}
      <div className="text-center space-y-2 mt-4">
        <h1 className="text-4xl font-medium tracking-tight text-foreground">
          Good afternoon{userName ? <>, <span className="text-primary">{userName}</span></> : ""}.
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Your executive work cockpit. AI-powered. Microsoft 365 connected.
        </p>
      </div>

      {/* Central Floating Search Bar */}
      <div className="max-w-3xl mx-auto relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
        <div className="relative flex items-center bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
          <div className="pl-4 pr-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <Input
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runPrompt(promptInput)}
            placeholder="Ask NexusHub anything, run a task, or prepare an action..."
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground h-12"
          />
          <div className="flex items-center gap-2 pr-2">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-muted-foreground text-xs font-mono">
              <span>Ctrl</span><span>K</span>
            </div>
            <Button disabled={sendAgentMessage.isPending} size="icon" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(139,92,246,0.5)]" onClick={() => runPrompt(promptInput)}>
              <Send className="h-4 w-4 ml-0.5" />
            </Button>
          </div>
        </div>
        {(agentResponse || sendAgentMessage.isPending || sendAgentMessage.isError) && (
          <div className="mt-4 w-full">
            <AgentResponsePanel
              response={agentResponse}
              isLoading={sendAgentMessage.isPending}
              error={sendAgentMessage.error}
              onConnect={() => connectMicrosoft()}
            />
            {agentResponse?.conversationId && (
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    clearAgentConversationId();
                    setAgentResponse(null);
                  }}
                >
                  New task
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ExecutiveSnapshotStrip
        items={items}
        counts={counts}
        activeFilter={activeFilter}
        onFilter={handleFilterChange}
      />

      <div id="work-feed" className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[440px]">
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
          <PriorityWorkFeed 
            items={filteredItems}
            activeFilter={activeFilter}
            setActiveFilter={handleFilterChange}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            isLoading={isLoading}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-5 flex flex-col">
          <h3 className="text-base font-semibold text-foreground mb-4 pl-1">Decision Desk</h3>
          <DecisionPanel item={selectedItem} />
        </div>
      </div>

      <div className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaceSignals(counts).map((signal) => (
              <InsightMiniCard
                key={signal.title}
                title={signal.title}
                value={signal.value}
                count={signal.count}
                color={signal.color}
              />
            ))}
          </div>
          <div className="md:col-span-4 min-h-[200px]">
            <KnowledgeGraphWidget />
          </div>
        </div>
      </div>
    </div>
  );
}

function workspaceSignals(counts: ReturnType<typeof useActionQueue>["counts"]) {
  return [
    {
      title: "Outlook",
      value: `${counts?.repliesNeeded ?? 0} replies need attention`,
      count: counts?.repliesNeeded ?? 0,
      color: "blue",
    },
    {
      title: "Calendar",
      value: `${counts?.meetingsToday ?? 0} meetings on today's agenda`,
      count: counts?.meetingsToday ?? 0,
      color: "indigo",
    },
    {
      title: "OneDrive",
      value: `${counts?.filesToReview ?? 0} files ready for review`,
      count: counts?.filesToReview ?? 0,
      color: "emerald",
    },
    {
      title: "Approvals",
      value: `${counts?.approvalsPending ?? 0} approvals pending`,
      count: counts?.approvalsPending ?? 0,
      color: "orange",
    },
    {
      title: "Teams",
      value: `${counts?.teamsMentions ?? 0} Teams items surfaced`,
      count: counts?.teamsMentions ?? 0,
      color: "purple",
    },
    {
      title: "AI",
      value: `${counts?.aiSuggestions ?? 0} suggested next moves`,
      count: counts?.aiSuggestions ?? 0,
      color: "cyan",
    },
  ];
}

function InsightMiniCard({ title, value, count, color }: { title: string, value: string, count: number, color: string }) {
  const bgColors: Record<string, string> = {
    blue: "bg-[#0078D4]/10 border-[#0078D4]/20 text-[#0078D4]",
    indigo: "bg-[#464EB8]/10 border-[#464EB8]/20 text-[#464EB8]",
    emerald: "bg-[#217346]/10 border-[#217346]/20 text-[#217346]",
    orange: "bg-[#D24726]/10 border-[#D24726]/20 text-[#D24726]",
    purple: "bg-[#7719AA]/10 border-[#7719AA]/20 text-[#7719AA]",
    cyan: "bg-cyan-400/10 border-cyan-400/20 text-cyan-300",
  };
  const intensity = Math.min(count, 5);
  return (
    <div className="rounded-xl border border-white/10 bg-card p-4 transition-colors hover:bg-white/5 flex flex-col justify-between h-32">
      <div className="flex items-center gap-2">
        <div className={`h-6 w-6 rounded flex items-center justify-center border ${bgColors[color]}`}>
          <span className="text-[10px] font-bold">{title[0]}</span>
        </div>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{value}</p>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full ${index < intensity ? bgColors[color].split(" ")[0] : "bg-white/10"}`}
            />
          ))}
        </div>
      </div>
    </div>
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
  if (backendUnavailable) return { className: "bg-red-500/10 text-red-500 border-red-500/20", message: "Backend is unreachable." };
  if (mcpStatus && mcpStatus !== "ok") return { className: "bg-amber-500/10 text-amber-500 border-amber-500/20", message: mcpError || "MCP is partial/error." };
  if (microsoftStatus === "disconnected") return { className: "bg-amber-500/10 text-amber-500 border-amber-500/20", message: "Microsoft 365 is disconnected.", action: "connect_microsoft" };
  if (microsoftStatus === "error") return { className: "bg-red-500/10 text-red-500 border-red-500/20", message: "Microsoft Graph activity failed." };
  if (activityError) return { className: "bg-red-500/10 text-red-500 border-red-500/20", message: activityError };
  return null;
}

function getMcpSourceError(sourceErrors: Record<string, string>) {
  if (sourceErrors?.mcp) {
    if (sourceErrors.mcp.includes("Connection refused") || sourceErrors.mcp.includes("unreachable")) {
      return `MCP is unreachable at http://localhost:8010. Start the MCP HTTP server or check MCP_SIMPLE_TOOL_URL.`;
    }
    return sourceErrors.mcp;
  }
  return undefined;
}
