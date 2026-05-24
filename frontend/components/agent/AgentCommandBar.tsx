"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import { useSendAgentMessage } from "@/features/agent/hooks";
import { AgentChatResponse } from "@/features/agent/types";
import { AgentResponsePanel } from "./AgentResponsePanel";

const schema = z.object({
  command: z.string().min(1, "Command is required"),
});

type FormData = z.infer<typeof schema>;

export function AgentCommandBar({
  streaming = false,
  placeholder,
  isPending,
  response,
  onResponse,
  onSubmitCommand,
}: {
  streaming?: boolean;
  placeholder?: string;
  isPending?: boolean;
  response?: AgentChatResponse | null;
  onResponse?: (response: AgentChatResponse) => void;
  onSubmitCommand?: (command: string) => Promise<AgentChatResponse | void> | AgentChatResponse | void;
}) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const [localResponse, setLocalResponse] = useState<AgentChatResponse | null>(null);

  const sendAgentMessage = useSendAgentMessage();

  const submitCommand = async (command: string) => {
    if (streaming) {
      // TODO: Implement streaming via /agent/chat/stream
      console.warn("Agent streaming can later be enabled through /agent/chat/stream using SSE.");
    } else {
      const submittedResponse =
        (await onSubmitCommand?.(command)) ||
        (await sendAgentMessage.mutateAsync({ message: command }));
      setLocalResponse(submittedResponse);
      onResponse?.(submittedResponse);
      reset();
    }
  };

  const onSubmit = async (data: FormData) => {
    await submitCommand(data.command);
  };
  const pending = isPending ?? sendAgentMessage.isPending;
  const visibleResponse = response ?? localResponse;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600 hidden sm:block">
          <Sparkles className="h-5 w-5" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex items-center gap-2">
          <Input
            {...register("command")}
            placeholder={placeholder || "Ask NexusHub to find emails, schedule meetings, or draft reports..."}
            className="border-0 focus-visible:ring-0 shadow-none text-base"
            disabled={isSubmitting || pending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isSubmitting || pending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
      <AgentResponsePanel response={visibleResponse} />
    </div>
  );
}
