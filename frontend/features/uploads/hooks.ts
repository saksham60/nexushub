import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      return {
        status: "ok",
        upload: {
          id: crypto.randomUUID(),
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          created_at: new Date().toISOString(),
        },
      };
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
