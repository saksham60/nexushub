import { MailItem } from "../mail/types";
import { CalendarEvent } from "../calendar/types";
import { RecentFile } from "../docs/types";
import { ApprovalAction } from "../approvals/types";

export type AgentRoutingDebug = {
  selectedTool?: string | null;
  confidence?: number;
  reason?: string;
  clarificationNeeded?: boolean;
  approvalRequired?: boolean;
};

export type AgentExecutionCanvas = {
  type: "compose_email" | "schedule_meeting" | "document_intelligence" | "approval_review" | "automation";
  title: string;
  payload?: Record<string, unknown>;
};

type AgentResponseMeta = {
  conversationId?: string;
  runId?: string;
  pendingIntentId?: string;
  executionCanvas?: AgentExecutionCanvas;
  routing?: AgentRoutingDebug;
};

export type AgentChatResponse = AgentResponseMeta & (
  | { type: "agent_response"; tool_used: string; data: { kind: "message"; message: string; tool_count?: number; categories?: Array<{ name: string; tools: string[] }> } }
  | { type: "agent_response"; tool_used: "mail_find_needs_reply"; data: { kind: "mail_results"; items: MailItem[]; summary?: string } }
  | { type: "agent_response"; tool_used: "calendar_get_today_agenda"; data: { kind: "calendar_agenda"; items: CalendarEvent[]; summary?: string } }
  | { type: "agent_response"; tool_used: "docs_list_recent_files"; data: { kind: "recent_files"; items: RecentFile[]; summary?: string } }
  | { type: "agent_response"; tool_used: "approval_list_pending"; data: { kind: "approvals"; items: ApprovalAction[] } }
  | { type: "connect_required"; provider: "microsoft"; connect_url: string; message: string }
  | { type: "approval_required"; approval?: ApprovalAction; message: string; draftBody?: string; approvalId?: string | null; toolUsed?: string | null; confidence?: number }
  | { type: "clarification"; message: string; toolUsed?: string | null; confidence?: number }
  | { type: "not_implemented"; module: "teams" | "docs" | "mail" | "calendar"; message: string }
  | { type: "error"; error: { code: string; message: string } }
);

export function normalizeAgentResponse(raw: any): AgentChatResponse {
  if (!raw || typeof raw !== "object") {
    return { type: "error", error: { code: "invalid_response", message: "Backend returned an invalid response." } };
  }

  if (raw.type === "connect_required" || raw.type === "approval_required" || raw.type === "not_implemented" || raw.type === "error") {
    return { ...raw, routing: normalizeRouting(raw) } as AgentChatResponse;
  }

  if (raw.type === "clarification") {
    return {
      type: "clarification",
      message: raw.message || "Please clarify what you want NexusHub to do.",
      toolUsed: raw.toolUsed,
      confidence: raw.confidence,
      routing: normalizeRouting(raw),
    };
  }

  if (raw.type !== "agent_response") {
    return { type: "error", error: { code: "unknown_response", message: "Backend returned an unknown response type." } };
  }

  const toolResult = raw.data || {};
  if (toolResult.status === "authentication_required") {
    return {
      type: "connect_required",
      provider: "microsoft",
      connect_url: toolResult.connect_url || "/auth/microsoft/start",
      message: toolResult.message || "Please connect Microsoft 365 first.",
      routing: normalizeRouting(raw),
    };
  }
  if (toolResult.status === "not_implemented") {
    return {
      type: "not_implemented",
      module: "teams",
      message: toolResult.message || "This tool is not implemented yet.",
      routing: normalizeRouting(raw),
    };
  }
  if (toolResult.ok === false) {
    return {
      type: "error",
      error: {
        code: toolResult.error?.code || "tool_error",
        message: toolResult.error?.message || toolResult.message || "The tool call failed.",
      },
      routing: normalizeRouting(raw),
    };
  }

  const data = toolResult.data || toolResult;
  if (data.status === "approval_required") {
    return {
      type: "approval_required",
      approval: {
        id: String(data.approvalId || crypto.randomUUID()),
        tool_name: raw.tool_used,
        action_type: data.actionType || "approval.required",
        preview: {
          kind: "generic",
          title: data.title || "Approval Required",
          description: data.preview || "Review this action before it is executed.",
        },
        status: "pending",
        created_at: new Date().toISOString(),
      },
      message: data.title || "Review this action before it is executed.",
      draftBody: data.preview,
      approvalId: data.approvalId,
      routing: normalizeRouting(raw),
    };
  }
  const toolName = raw.tool_used;

  if (toolName === "direct_response") {
    return {
      type: "agent_response",
      tool_used: "direct_response",
      data: {
        kind: "message",
        message: data.message || "Done.",
        tool_count: data.tool_count,
        categories: data.categories,
      },
      routing: normalizeRouting(raw),
    };
  }

  if (toolName === "mail_find_needs_reply") {
    const groups = Array.isArray(data.groups) ? data.groups : [];
    const items = groups
      .flatMap((group: any) => Array.isArray(group.items) ? group.items : [])
      .map((item: any): MailItem => ({
        id: String(item.messageId || item.id || crypto.randomUUID()),
        subject: item.subject || "(No subject)",
        from: {
          name: item.sender,
          email: item.senderEmail || item.sender || "unknown",
        },
        received_at: item.receivedAt || item.received_at || new Date().toISOString(),
        preview: item.preview || "",
        importance: item.urgency === "high" ? "high" : "normal",
        reason: item.reason,
      }));
    return {
      type: "agent_response",
      tool_used: "mail_find_needs_reply",
      data: {
        kind: "mail_results",
        items,
        summary: data.count ? `Found ${data.count} email(s) that may need attention.` : "No reply-needed emails found.",
      },
      routing: normalizeRouting(raw),
    };
  }

  if (toolName === "calendar_get_today_agenda") {
    const rawEvents = Array.isArray(data.value) ? data.value : Array.isArray(data.meetings) ? data.meetings : [];
    const items = rawEvents.map((event: any): CalendarEvent => ({
      id: String(event.id || event.eventId || crypto.randomUUID()),
      subject: event.subject || event.title || "(Untitled event)",
      start: event.start?.dateTime || event.start || new Date().toISOString(),
      end: event.end?.dateTime || event.end || new Date().toISOString(),
      organizer: event.organizer?.emailAddress
        ? {
            name: event.organizer.emailAddress.name,
            email: event.organizer.emailAddress.address,
          }
        : typeof event.organizer === "string"
          ? { name: event.organizer }
          : undefined,
      location: event.location?.displayName || event.location,
      preparation_notes: event.preparation_notes,
    }));
    return {
      type: "agent_response",
      tool_used: "calendar_get_today_agenda",
      data: {
        kind: "calendar_agenda",
        items,
        summary: items.length ? `Loaded ${items.length} calendar event(s) for today.` : "No calendar events found for today.",
      },
      routing: normalizeRouting(raw),
    };
  }

  if (toolName === "docs_list_recent_files") {
    const rawFiles = Array.isArray(data.value) ? data.value : Array.isArray(data.items) ? data.items : [];
    const items = rawFiles.map((file: any): RecentFile => ({
      id: String(file.id || file.fileId || crypto.randomUUID()),
      name: file.name || "(Untitled file)",
      web_url: file.webUrl || file.web_url,
      last_modified_at: file.lastModifiedDateTime || file.lastModifiedAt || file.last_modified_at,
      size_bytes: file.size || file.sizeBytes || file.size_bytes,
      source: "onedrive",
    }));
    return {
      type: "agent_response",
      tool_used: "docs_list_recent_files",
      data: {
        kind: "recent_files",
        items,
        summary: items.length ? `Found ${items.length} recent file(s).` : "No recent files found.",
      },
      routing: normalizeRouting(raw),
    };
  }

  if (toolName === "approval_list_pending") {
    const items = Array.isArray(data.items) ? data.items : [];
    return {
      type: "agent_response",
      tool_used: "approval_list_pending",
      data: {
        kind: "approvals",
        items,
      },
      routing: normalizeRouting(raw),
    };
  }

  return {
    type: "agent_response",
    tool_used: String(toolName || "tool_result"),
    data: {
      kind: "message",
      message: genericToolMessage(toolName, data),
    },
    routing: normalizeRouting(raw),
  };
}

function normalizeRouting(raw: any): AgentRoutingDebug | undefined {
  const routing = raw?.routing || raw?.agent;
  if (!routing || typeof routing !== "object") return undefined;
  return {
    selectedTool: routing.selectedTool ?? raw.tool_used ?? raw.toolUsed ?? null,
    confidence: typeof routing.confidence === "number" ? routing.confidence : undefined,
    reason: typeof routing.reason === "string" ? routing.reason : undefined,
    clarificationNeeded: Boolean(routing.clarificationNeeded),
    approvalRequired: Boolean(routing.approvalRequired),
  };
}

function genericToolMessage(toolName: string, data: any): string {
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.summary === "string" && data.summary.trim()) return data.summary;
  if (typeof data?.report === "string" && data.report.trim()) return data.report;
  if (typeof data?.title === "string" && data.title.trim()) return data.title;
  if (typeof data?.count === "number") return `${toolName} returned ${data.count} result(s).`;
  return `${toolName || "NexusHub"} completed.`;
}
