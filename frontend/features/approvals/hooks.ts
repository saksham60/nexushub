import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { PaginatedResponse, ApprovalAction } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function useApprovals({ status, cursor, limit }: { status: string; cursor?: string | null; limit: number }) {
  return useQuery<PaginatedResponse<ApprovalAction>>({
    queryKey: queryKeys.approvals.list({ status, cursor, limit }),
    queryFn: async () => {
      let url = `${endpoints.approvals}?status=${status}&limit=${limit}`;
      if (cursor) url += `&cursor=${cursor}`;
      return apiClient.get<PaginatedResponse<ApprovalAction>>(url);
    },
  });
}

export function useApproveAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalId: string) => apiClient.post(endpoints.approvalApprove(approvalId)),
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
    mutationFn: (approvalId: string) => apiClient.post(endpoints.approvalReject(approvalId)),
    onSuccess: () => {
      toast.success("Action rejected.");
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}
