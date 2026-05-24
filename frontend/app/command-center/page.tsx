"use client";

import { useState } from "react";
import { useActionQueue } from "@/features/command-center/hooks/useActionQueue";
import { MorningBrief } from "@/components/command-center/MorningBrief";
import { ExecutiveSnapshotStrip } from "@/components/command-center/ExecutiveSnapshotStrip";
import { PriorityWorkFeed } from "@/components/command-center/PriorityWorkFeed";
import { DecisionPanel } from "@/components/command-center/DecisionPanel";
import { CommandCenterActionHub } from "@/components/command-center/CommandCenterActionHub";
import { AlertCircle } from "lucide-react";
import { AgentChatResponse } from "@/features/agent/types";
import { useSendAgentMessage } from "@/features/agent/hooks";

export default function CommandCenterPage() {
  const [agentResponse, setAgentResponse] = useState<AgentChatResponse | null>(null);
  const sendAgentMessage = useSendAgentMessage();
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
  } = useActionQueue();
  const statusBanner = getStatusBanner({
    backendUnavailable: !health && isError,
    mcpStatus: health?.mcp,
    mcpError: sourceErrors.mcp,
    microsoftStatus: health?.microsoft,
    activityError: isError ? errorMessage : null,
  });

  const runPrompt = async (text: string) => {
    const response = await sendAgentMessage.mutateAsync({ message: text });
    setAgentResponse(response);
    return response;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
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

      <CommandCenterActionHub onRunPrompt={runPrompt} />
      
      <ExecutiveSnapshotStrip items={items} counts={counts} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="h-[600px]">
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

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="h-[600px]">
            <DecisionPanel item={selectedItem} />
          </div>
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
  if (backendUnavailable) {
    return {
      className: "bg-red-50 text-red-800 border-red-200",
      message: "Backend is unreachable. Start NexusHub backend and try again.",
    };
  }
  if (mcpStatus && mcpStatus !== "ok") {
    return {
      className: "bg-red-50 text-red-800 border-red-200",
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
