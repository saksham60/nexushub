"use client";

import { useSession } from "@/features/session/hooks";
import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
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
    <section className="grid gap-4 pt-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-end">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {getGreeting()}, {name}.
        </h1>
        <p className="mt-2 text-base text-zinc-500">
          Your executive work cockpit. Decisions first, noise filtered out.
        </p>
      </div>

      <div className="lg:justify-self-end lg:w-full">
        <AgentCommandBar
          placeholder="Ask NexusHub to find, summarize, prepare, or draft..."
          onSubmitCommand={onRunPrompt}
          response={agentResponse}
          isPending={isSubmittingPrompt}
        />
      </div>
    </section>
  );
}
