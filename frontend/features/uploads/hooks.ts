import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { getRequestIdentity } from "@/lib/session/localUser";

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const identity = getRequestIdentity();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", identity.user_id);
      if (identity.workspace_id) formData.append("workspace_id", identity.workspace_id);
      return apiClient.post<UploadResponse>(endpoints.documentUpload, formData);
    },
    onSuccess: () => {
      toast.success("File uploaded successfully.");
      queryClient.invalidateQueries({ queryKey: queryKeys.uploads.list() });
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}
