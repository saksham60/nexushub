"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
import { AgentResponsePanel } from "@/components/agent/AgentResponsePanel";
import { SuggestedPromptChips } from "@/components/agent/SuggestedPromptChips";
import { AgentChatResponse } from "@/features/agent/types";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/queryKeys";
import { useSession } from "@/features/session/hooks";

export default function HomePage() {
  const { data: session } = useSession();
  const [lastResponse, setLastResponse] = useState<AgentChatResponse | null>(null);
  
  // This is a hacky way to observe the mutation result for the UI panel, 
  // in a real app we'd keep this in the AgentCommandBar or a shared context.
  // For now, we will rely on TanStack Query cache updates.

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const name = session?.status === "ok" ? session.user.display_name.split(" ")[0] : "there";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title={`${getGreeting()}, ${name}.`}
        description="NexusHub turns Microsoft 365 activity into action queues, approvals, and execution workflows."
      />

      <div className="max-w-3xl mx-auto space-y-6">
        <AgentCommandBar />
        <SuggestedPromptChips 
          prompts={[
            "Find emails that need reply",
            "Show my agenda for today",
            "Show emails awaiting approval"
          ]}
          onSelect={(p) => {
            // Ideally this would fill the input, but we can just run it directly
            // For MVP, we leave this as a UI placeholder that users can click to type
            document.querySelector<HTMLInputElement>('input[name="command"]')?.setAttribute('value', p);
          }}
        />
        
        <AgentResponsePanel response={lastResponse} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
        {/* Placeholder cards for Daily Brief, Action Queue, Suggested Actions */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center h-48">
          <h3 className="font-medium text-zinc-900 mb-2">Daily Brief</h3>
          <p className="text-sm text-zinc-500">Summary of your day's priorities will appear here.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center h-48">
          <h3 className="font-medium text-zinc-900 mb-2">Action Queue</h3>
          <p className="text-sm text-zinc-500">Pending tasks extracted from your communications.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center h-48">
          <h3 className="font-medium text-zinc-900 mb-2">Suggested Actions</h3>
          <p className="text-sm text-zinc-500">Proactive recommendations from NexusHub.</p>
        </div>
      </div>
    </div>
  );
}
