"use client";

import { useSession } from "@/features/session/hooks";
import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
import { SuggestedPromptChips } from "@/components/agent/SuggestedPromptChips";
import { AgentChatResponse } from "@/features/agent/types";

export function MorningBrief({
  onRunPrompt,
  agentResponse,
  isSubmittingPrompt,
}: {
  onRunPrompt?: (prompt: string) => Promise<AgentChatResponse | void> | AgentChatResponse | void;
  agentResponse?: AgentChatResponse | null;
  isSubmittingPrompt?: boolean;
}) {
  const { data: session } = useSession();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const name = session?.status === "ok" ? session.user.display_name.split(" ")[0] : "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light text-zinc-900 tracking-tight">
          {getGreeting()}, {name}.
        </h1>
        <p className="text-zinc-500 mt-2 text-lg">
          Here&apos;s what needs your attention across email, meetings, documents, and approvals.
        </p>
      </div>

      <div className="max-w-3xl">
        <AgentCommandBar
          placeholder="Ask NexusHub to find, summarize, prepare, or draft..."
          onSubmitCommand={onRunPrompt}
          response={agentResponse}
          isPending={isSubmittingPrompt}
        />
        <div className="mt-3">
          <SuggestedPromptChips
            prompts={[
              "What needs my attention?",
              "Prepare my next meeting",
              "Draft urgent replies",
              "Summarize recent files",
              "Show pending approvals",
              "How many tools are available?",
            ]}
            onSelect={(prompt) => void onRunPrompt?.(prompt)}
          />
        </div>
      </div>
    </div>
  );
}
