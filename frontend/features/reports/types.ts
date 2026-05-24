export type DocumentAnalysisResponse = {
  documentId: string;
  filename: string;
  analysisType: "summary" | "risks" | "action_items" | "executive_brief" | string;
  summary: string;
  keyPoints: string[];
  risks: string[];
  actionItems: string[];
  confidence: number;
  sourceStats: {
    charactersExtracted: number;
    parser?: string;
    truncatedForLlm?: boolean;
    pages?: number | null;
    sheets?: number | null;
    rows?: number | null;
  };
  llmStatus: "ok" | "error" | string;
};

export type DocumentReportSection = {
  heading: string;
  content: string;
};

export type ReportResponse = {
  documentId: string;
  reportId: string;
  filename: string;
  title: string;
  report: string;
  sections: DocumentReportSection[];
  sourceStats: {
    charactersExtracted: number;
    parser?: string;
    truncatedForLlm?: boolean;
    pages?: number | null;
    sheets?: number | null;
    rows?: number | null;
  };
  llmStatus: "ok" | "error" | string;
  createdAt: string;
};

export type CreateReportPayload = {
  documentId: string;
  reportTitle: string;
  instructions?: string;
  format?: "executive_summary" | "detailed_report" | "bullet_brief" | string;
};

export type AnalyzeDocumentPayload = {
  documentId: string;
  analysisType?: "summary" | "risks" | "action_items" | "executive_brief" | string;
  instructions?: string;
};
