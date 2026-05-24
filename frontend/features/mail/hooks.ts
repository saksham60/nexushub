import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { getRequestIdentity } from "@/lib/session/localUser";
import {
  DraftCreateRequest,
  DraftCreateResponse,
  DraftPreviewRequest,
  DraftPreviewResponse,
} from "./types";

export function useCreateDraftPreview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DraftPreviewRequest) =>
      apiClient.post<DraftPreviewResponse>(endpoints.mailDraftPreview, {
        ...getRequestIdentity(),
        ...payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useCreateOutlookDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DraftCreateRequest) =>
      apiClient.post<DraftCreateResponse>(endpoints.mailDraftCreate, {
        ...getRequestIdentity(),
        ...payload,
        simulate: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success(`Draft created in Outlook for ${data.mailboxEmail}`);
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });
}
