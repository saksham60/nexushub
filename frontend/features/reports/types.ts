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
    pages?: number | null;
    sheets?: number | null;
    rows?: number | null;
  };
};

export type DocumentReportSection = {
  heading: string;
  content: string;
};

export type ReportResponse = {
  documentId: string;
  reportId: string;
  title: string;
  report: string;
  sections: DocumentReportSection[];
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
