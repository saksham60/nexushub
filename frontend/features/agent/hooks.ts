import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeAgentResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { getRequestIdentity } from "@/lib/session/localUser";
import { getAgentConversationId, rememberAgentConversationId } from "./conversation";

export function useSendAgentMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { message: string }) => {
      const raw = await apiClient.post(endpoints.agentChat, {
        ...getRequestIdentity(),
        message: payload.message,
        conversation_id: getAgentConversationId(),
      });
      const normalized = normalizeAgentResponse(raw);
      const conversationId =
        typeof (raw as any)?.conversationId === "string" ? (raw as any).conversationId : undefined;
      rememberAgentConversationId(conversationId);
      return {
        ...normalized,
        conversationId,
        runId: typeof (raw as any)?.runId === "string" ? (raw as any).runId : undefined,
        pendingIntentId:
          typeof (raw as any)?.pendingIntentId === "string" ? (raw as any).pendingIntentId : undefined,
        executionCanvas:
          (raw as any)?.executionCanvas && typeof (raw as any).executionCanvas === "object"
            ? (raw as any).executionCanvas
            : undefined,
      };
    },
    onSuccess: (data) => {
      if (data.type === "approval_required") {
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list({ status: "pending", limit: 20 }) });
      } else if (data.type === "connect_required") {
        queryClient.invalidateQueries({ queryKey: queryKeys.microsoft.status() });
      } else if (data.type === "agent_response") {
        if (data.data.kind === "mail_results") {
          queryClient.setQueryData(queryKeys.agent.result("mail_find_needs_reply"), data.data);
        } else if (data.data.kind === "calendar_agenda") {
          queryClient.setQueryData(queryKeys.agent.result("calendar_get_today_agenda"), data.data);
        } else if (data.data.kind === "recent_files") {
          queryClient.setQueryData(queryKeys.agent.result("docs_list_recent_files"), data.data);
        }
      }
    },
  });
}

// TODO: Implement streaming wrapper later when backend supports SSE
export function sendAgentMessageStream(_payload: { message: string }, _handlers: unknown) {
  void _payload;
  void _handlers;
  console.warn("sendAgentMessageStream is a placeholder for future SSE support");
}
