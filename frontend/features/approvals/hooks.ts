import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { PaginatedResponse, ApprovalAction } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { ensureUserId } from "@/lib/session/localUser";

export function useApprovals({ status, cursor, limit }: { status: string; cursor?: string | null; limit: number }) {
  return useQuery<PaginatedResponse<ApprovalAction>>({
    queryKey: queryKeys.approvals.list({ status, cursor, limit }),
    queryFn: async () => {
      if (status !== "pending" && status !== "all") {
        return {
          status: "ok",
          items: [],
          page_info: { next_cursor: null, has_more: false, limit },
        };
      }

      const url = `${endpoints.approvals}?user_id=${encodeURIComponent(ensureUserId())}`;
      const response = await apiClient.get<{ count?: number; items?: ApprovalAction[] }>(url);
      return {
        status: "ok",
        items: response.items || [],
        page_info: {
          next_cursor: null,
          has_more: false,
          limit,
        },
      };
    },
  });
}

export function useApproveAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalId: string) =>
      apiClient.post(`${endpoints.approvalApprove(approvalId)}?user_id=${encodeURIComponent(ensureUserId())}`),
    onSuccess: () => {
      toast.success("Action approved successfully.");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}

export function useRejectAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalId: string) =>
      apiClient.post(`${endpoints.approvalReject(approvalId)}?user_id=${encodeURIComponent(ensureUserId())}`),
    onSuccess: () => {
      toast.success("Action rejected.");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}
