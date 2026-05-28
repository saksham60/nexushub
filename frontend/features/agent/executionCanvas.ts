import { CanvasType } from "@/features/canvas/CanvasContext";
import { ActionItem } from "@/features/command-center/types";
import { AgentChatResponse, AgentExecutionCanvas } from "./types";

export type CanvasOpenRequest = {
  type: Exclude<CanvasType, null>;
  item: ActionItem;
  payload: Record<string, unknown>;
};

type CanvasOptions = {
  backendStatus?: "preparing" | "ready" | "error";
  backendError?: string;
};

export function canvasRequestFromAgentResponse(
  response: AgentChatResponse,
  prompt: string,
): CanvasOpenRequest | null {
  if (response.executionCanvas) {
    return requestFromExecutionCanvas(response.executionCanvas, response, prompt);
  }

  const toolName = response.routing?.selectedTool || responseToolName(response);
  if (response.type === "approval_required") {
    if (toolName?.startsWith("mail_")) return inferEmailCanvas(prompt, response.message, { backendStatus: "ready" });
    if (toolName?.startsWith("calendar_")) return inferMeetingCanvas(prompt, response.message, { backendStatus: "ready" });
    if (toolName?.startsWith("docs_")) return inferDocumentCanvas(prompt, response.message, { backendStatus: "ready" });
    return inferApprovalCanvas(prompt, response.message, response.approvalId || response.approval?.id, { backendStatus: "ready" });
  }

  if (response.type === "agent_response") {
    const message = responseMessage(response);
    if (toolName?.startsWith("mail_create")) return inferEmailCanvas(prompt, message, { backendStatus: "ready" });
    if (toolName?.startsWith("calendar_")) return inferMeetingCanvas(prompt, message, { backendStatus: "ready" });
    if (toolName?.startsWith("docs_")) return inferDocumentCanvas(prompt, message, { backendStatus: "ready" });
    if (toolName?.startsWith("approval_")) return inferApprovalCanvas(prompt, message, undefined, { backendStatus: "ready" });
  }

  if (response.type === "clarification") {
    return inferCanvasFromPrompt(prompt, {
      backendStatus: "ready",
      backendError: response.message,
    });
  }

  if (response.type === "error") {
    return inferCanvasFromPrompt(prompt, {
      backendStatus: "error",
      backendError: response.error.message,
    });
  }

  return null;
}

export function inferCanvasFromPrompt(prompt: string, options: CanvasOptions = {}): CanvasOpenRequest | null {
  const normalized = prompt.toLowerCase();
  if (isEmailPrompt(normalized, prompt)) return inferEmailCanvas(prompt, undefined, options);
  if (isMeetingPrompt(normalized)) return inferMeetingCanvas(prompt, undefined, options);
  if (isDocumentPrompt(normalized)) return inferDocumentCanvas(prompt, undefined, options);
  if (isAutomationPrompt(normalized)) return inferAutomationCanvas(prompt, options);
  if (isApprovalPrompt(normalized)) return inferApprovalCanvas(prompt, undefined, undefined, options);
  return null;
}

function requestFromExecutionCanvas(
  canvas: AgentExecutionCanvas,
  response: AgentChatResponse,
  prompt: string,
): CanvasOpenRequest | null {
  const type = mapExecutionCanvasType(canvas.type);
  if (!type) return null;
  const payload = {
    prompt,
    ...(canvas.payload || {}),
    backendStatus: "ready",
  };
  return {
    type,
    payload,
    item: {
      id: response.runId || response.pendingIntentId || `agent-${Date.now()}`,
      type: actionItemTypeForCanvas(canvas.type),
      title: canvas.title,
      description: responseMessage(response) || prompt,
      source: "NexusHub",
      priority: "high",
      status: response.type === "approval_required" ? "pending" : "new",
      primaryActionLabel: "Review",
      metadata: payload,
    },
  };
}

function mapExecutionCanvasType(type: AgentExecutionCanvas["type"]): Exclude<CanvasType, null> | null {
  if (type === "compose_email") return "email";
  if (type === "schedule_meeting") return "meeting";
  if (type === "document_intelligence") return "document";
  if (type === "approval_review") return "approval";
  if (type === "automation") return "automation";
  return null;
}

function actionItemTypeForCanvas(type: AgentExecutionCanvas["type"]): ActionItem["type"] {
  if (type === "compose_email") return "email";
  if (type === "schedule_meeting") return "calendar";
  if (type === "document_intelligence") return "document";
  if (type === "automation") return "automation";
  return "approval";
}

function inferEmailCanvas(prompt: string, summary?: string, options: CanvasOptions = {}): CanvasOpenRequest {
  const recipient = extractEmail(prompt);
  const subject = extractSubject(prompt) || "New message";
  const body = extractBody(prompt, subject);
  const title = recipient ? `Compose email to ${recipient}` : "Compose email";
  const payload = {
    prompt,
    subject,
    recipients: recipient ? [recipient] : [],
    to: recipient ? [recipient] : [],
    context: prompt,
    body,
    draftBody: body,
    bodyPreview: summary || prompt,
    mode: "compose",
    ...options,
  };
  return {
    type: "email",
    payload,
    item: {
      id: `prompt-email-${Date.now()}`,
      type: "email",
      title,
      description: summary || prompt,
      source: "NexusHub",
      priority: "high",
      status: "new",
      primaryActionLabel: "Compose",
      metadata: payload,
    },
  };
}

function inferMeetingCanvas(prompt: string, summary?: string, options: CanvasOptions = {}): CanvasOpenRequest {
  const title = extractMeetingTitle(prompt);
  const attendees = extractAttendees(prompt);
  const payload = {
    prompt,
    subject: title,
    title,
    attendees,
    context: prompt,
    ...options,
  };
  return {
    type: "meeting",
    payload,
    item: {
      id: `prompt-meeting-${Date.now()}`,
      type: "calendar",
      title,
      description: summary || prompt,
      source: "NexusHub",
      priority: "high",
      status: "new",
      primaryActionLabel: "Schedule",
      metadata: payload,
    },
  };
}

function inferDocumentCanvas(prompt: string, summary?: string, options: CanvasOptions = {}): CanvasOpenRequest {
  const title = extractDocumentTitle(prompt);
  const payload = {
    prompt,
    title,
    analysisGoal: prompt,
    summary,
    ...options,
  };
  return {
    type: "document",
    payload,
    item: {
      id: `prompt-document-${Date.now()}`,
      type: "document",
      title,
      description: summary || prompt,
      source: "NexusHub",
      priority: "high",
      status: "new",
      primaryActionLabel: "Analyze",
      metadata: payload,
    },
  };
}

function inferApprovalCanvas(
  prompt: string,
  summary?: string,
  approvalId?: string | null,
  options: CanvasOptions = {},
): CanvasOpenRequest {
  const payload = {
    prompt,
    approvalId,
    preview: summary || prompt,
    ...options,
  };
  return {
    type: "approval",
    payload,
    item: {
      id: approvalId || `prompt-approval-${Date.now()}`,
      type: "approval",
      title: "Review approval",
      description: summary || prompt,
      source: "NexusHub",
      priority: "high",
      status: "pending",
      primaryActionLabel: "Review",
      metadata: payload,
    },
  };
}

function inferAutomationCanvas(prompt: string, options: CanvasOptions = {}): CanvasOpenRequest {
  const payload = {
    prompt,
    title: "Automation review",
    description: prompt,
    ...options,
  };
  return {
    type: "automation",
    payload,
    item: {
      id: `prompt-automation-${Date.now()}`,
      type: "automation",
      title: "Automation review",
      description: prompt,
      source: "NexusHub",
      priority: "medium",
      status: "new",
      primaryActionLabel: "Review automation",
      metadata: payload,
    },
  };
}

function responseToolName(response: AgentChatResponse): string | undefined {
  if (response.type === "agent_response") return response.tool_used;
  if ("toolUsed" in response && typeof response.toolUsed === "string") return response.toolUsed;
  return undefined;
}

function responseMessage(response: AgentChatResponse): string | undefined {
  if (response.type === "agent_response" && response.data.kind === "message") return response.data.message;
  if ("message" in response && typeof response.message === "string") return response.message;
  return undefined;
}

function isEmailPrompt(normalized: string, original: string) {
  return (
    /\b(email|mail|reply|draft|compose)\b/.test(normalized) ||
    (/\b(send|write|draft|compose)\b/.test(normalized) && Boolean(extractEmail(original)))
  );
}

function isMeetingPrompt(normalized: string) {
  return /\b(schedule|book|reschedule|meeting|calendar|invite)\b/.test(normalized);
}

function isDocumentPrompt(normalized: string) {
  return /\b(analyze|summarize|review|brief|extract)\b/.test(normalized) && /\b(document|doc|deck|pdf|file|report|strategy)\b/.test(normalized);
}

function isAutomationPrompt(normalized: string) {
  return /\b(automate|automation|rule|monitor|watch|trigger|runbook)\b/.test(normalized);
}

function isApprovalPrompt(normalized: string) {
  return /\b(approve|reject|approval|decision|sign[- ]?off)\b/.test(normalized);
}

function extractEmail(prompt: string) {
  return prompt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractSubject(prompt: string) {
  const match = prompt.match(/\b(?:about|regarding|subject|for)\s+(.+)$/i);
  if (!match?.[1]) return "";
  return cleanSentence(match[1]).slice(0, 80);
}

function extractBody(prompt: string, subject: string) {
  const body = prompt.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "").trim();
  if (!body || body === subject) return "";
  return body;
}

function extractMeetingTitle(prompt: string) {
  const withMatch = prompt.match(/\bmeeting\s+with\s+([^,.]+)(?:[,.]|$)/i);
  if (withMatch?.[1]) return `Meeting with ${cleanSentence(withMatch[1])}`;
  const aboutMatch = prompt.match(/\b(?:about|regarding|for)\s+([^,.]+)(?:[,.]|$)/i);
  if (aboutMatch?.[1]) return cleanSentence(aboutMatch[1]);
  return "Schedule meeting";
}

function extractAttendees(prompt: string) {
  const email = extractEmail(prompt);
  return email ? [email] : [];
}

function extractDocumentTitle(prompt: string) {
  const quoted = prompt.match(/"([^"]+)"/)?.[1] || prompt.match(/'([^']+)'/)?.[1];
  if (quoted) return cleanSentence(quoted);
  const fileMatch = prompt.match(/\b([\w\s-]+\.(?:pdf|docx|doc|pptx|xlsx|csv|txt))\b/i)?.[1];
  if (fileMatch) return cleanSentence(fileMatch);
  return "Document Intelligence";
}

function cleanSentence(value: string) {
  return value.replace(/[?.!]+$/, "").trim();
}
