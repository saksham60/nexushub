export type ApiStatus = "ok" | "error";

export type ApiErrorResponse = {
  status: "error";
  error: {
    code: string;
    message: string;
    details?: any;
  };
  request_id?: string;
};

export class ApiError extends Error {
  public code: string;
  public details?: any;
  public request_id?: string;

  constructor(response: ApiErrorResponse) {
    super(response.error.message);
    this.name = "ApiError";
    this.code = response.error.code;
    this.details = response.error.details;
    this.request_id = response.request_id;
  }
}

export function getFriendlyErrorMessage(error: any): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "MICROSOFT_NOT_CONNECTED":
      case "MICROSOFT_DISCONNECTED":
      case "authentication_required":
        return "Connect Microsoft 365 to unlock Outlook, Calendar, and OneDrive data.";
      case "consent_required":
      case "GRAPH_PERMISSION_MISSING":
        return "Mail.ReadWrite permission is missing. Reconnect Microsoft 365 and approve Mail.ReadWrite.";
      case "LLM_UNAVAILABLE":
        return "The LLM service is unavailable. Please try again.";
      case "INSUFFICIENT_EMAIL_CONTEXT":
        return "This email does not have enough context for a safe draft.";
      case "DOCUMENT_PARSING_ERROR":
        return error.message || "NexusHub could not extract readable text from this file.";
      case "UNSUPPORTED_DOCUMENT":
        return error.message || "Unsupported file type. Upload a PDF, DOCX, XLSX, CSV, or TXT file.";
      case "FEATURE_DISABLED":
        return error.message || "This NexusHub feature is disabled.";
      case "graph_error":
      case "GRAPH_ERROR":
        return "Microsoft Graph is not responding. Your in-app draft was kept.";
      case "mcp_unreachable":
        return "NexusHub MCP is not reachable. Your in-app draft was kept.";
      case "NOT_IMPLEMENTED":
        return "This module is prepared but not enabled yet.";
      case "BACKEND_UNAVAILABLE":
        return "NexusHub backend is not reachable. Start the backend on port 3001.";
      case "TOKEN_REFRESH_FAILED":
        return "Microsoft connection expired. Please reconnect Microsoft 365.";
      case "UNAUTHENTICATED":
        return "Please sign in.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred.";
}
