import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ReportResponse } from "./types";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function useCreateReport() {
  return useMutation({
    mutationFn: (payload: { title: string; prompt: string; file_ids: string[] }) => {
      return apiClient.post<ReportResponse>(endpoints.reportsCreate, payload);
    },
    onSuccess: () => {
      toast.success("Report generation started.");
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}
