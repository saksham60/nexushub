import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { PaginatedResponse, ApprovalAction } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { ensureUserId } from "@/lib/session/localUser";
import { normalizeApprovalId } from "./ids";
import { clearResolvedApprovalFromCaches } from "./cache";

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
    mutationFn: (approvalId: string) => {
      const normalizedApprovalId = normalizeApprovalId(approvalId);
      return apiClient.post(
        `${endpoints.approvalApprove(normalizedApprovalId)}?user_id=${encodeURIComponent(ensureUserId())}`,
      );
    },
    onSuccess: (data, approvalId) => {
      toast.success("Action approved successfully.");
      clearResolvedApprovalFromCaches(queryClient, approvalId, data);
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}

export function useRejectAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalId: string) => {
      const normalizedApprovalId = normalizeApprovalId(approvalId);
      return apiClient.post(
        `${endpoints.approvalReject(normalizedApprovalId)}?user_id=${encodeURIComponent(ensureUserId())}`,
      );
    },
    onSuccess: (data, approvalId) => {
      toast.success("Action rejected.");
      clearResolvedApprovalFromCaches(queryClient, approvalId, data);
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}
