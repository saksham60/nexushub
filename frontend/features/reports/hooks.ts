import { useMutation } from "@tanstack/react-query";
import {
  AnalyzeDocumentPayload,
  CreateReportPayload,
  DocumentAnalysisResponse,
  ReportResponse,
} from "./types";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export function useAnalyzeDocument() {
  return useMutation({
    mutationFn: async (payload: AnalyzeDocumentPayload): Promise<DocumentAnalysisResponse> => {
      return apiClient.post<DocumentAnalysisResponse>(endpoints.documentAnalyze, {
        documentId: payload.documentId,
        analysisType: payload.analysisType || "executive_brief",
        instructions: payload.instructions || "",
      });
    },
    onSuccess: () => {
      toast.success("Document analysis completed.");
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });
}

export function useCreateReport() {
  return useMutation({
    mutationFn: async (payload: CreateReportPayload): Promise<ReportResponse> => {
      return apiClient.post<ReportResponse>(endpoints.documentReports, {
        documentId: payload.documentId,
        reportTitle: payload.reportTitle,
        instructions: payload.instructions || "",
        format: payload.format || "executive_summary",
      });
    },
    onSuccess: () => {
      toast.success("Report generated.");
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error));
    }
  });
}
