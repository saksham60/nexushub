import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { UploadResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "doc_insights");
      return apiClient.post<UploadResponse>(endpoints.uploadsCreate, formData);
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
