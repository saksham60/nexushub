import { useMutation } from "@tanstack/react-query";
import { ReportResponse } from "./types";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";

export function useCreateReport() {
  return useMutation({
    mutationFn: async (payload: { title: string; prompt: string; file_ids: string[] }): Promise<ReportResponse> => {
      return {
        status: "ok",
        report: {
          id: crypto.randomUUID(),
          title: payload.title,
          created_at: new Date().toISOString(),
        },
      };
    },
    onSuccess: () => {
      toast.success("Report generation started.");
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}
