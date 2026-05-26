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
  DraftReplyRequest,
  DraftReplyResponse,
  DraftSendRequest,
  DraftSendResponse,
} from "./types";

export function useGenerateDraftReply() {
  return useMutation({
    mutationFn: (payload: DraftReplyRequest) =>
      apiClient.post<DraftReplyResponse>(endpoints.mailDraftReply, {
        ...getRequestIdentity(),
        ...payload,
      }),
  });
}

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

type MailMutationOptions = {
  toastOnSuccess?: boolean;
  toastOnError?: boolean;
};

export function useCreateOutlookDraft(options: MailMutationOptions = {}) {
  const queryClient = useQueryClient();
  const { toastOnSuccess = true, toastOnError = true } = options;

  return useMutation({
    mutationFn: (payload: DraftCreateRequest) =>
      apiClient.post<DraftCreateResponse>(endpoints.mailDraftCreate, {
        ...getRequestIdentity(),
        ...payload,
        simulate: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      if (toastOnSuccess) {
        toast.success(`Draft created in Outlook for ${data.mailboxEmail}`);
      }
    },
    onError: (error) => {
      if (toastOnError) {
        toast.error(getFriendlyErrorMessage(error));
      }
    },
  });
}

export function useSendOutlookDraft(options: MailMutationOptions = {}) {
  const { toastOnSuccess = true, toastOnError = true } = options;

  return useMutation({
    mutationFn: (payload: DraftSendRequest) =>
      apiClient.post<DraftSendResponse>(endpoints.mailDraftSend, {
        ...getRequestIdentity(),
        ...payload,
        simulate: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
    }),
    onSuccess: (data) => {
      if (toastOnSuccess) {
        toast.success(`Outlook accepted the email for sending from ${data.mailboxEmail}`);
      }
    },
    onError: (error) => {
      if (toastOnError) {
        toast.error(getFriendlyErrorMessage(error));
      }
    },
  });
}
