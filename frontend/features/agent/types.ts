import { MailItem } from "../mail/types";
import { CalendarEvent } from "../calendar/types";
import { RecentFile } from "../docs/types";
import { ApprovalAction } from "../approvals/types";

export type AgentChatResponse =
  | { type: "agent_response"; tool_used: "mail_find_needs_reply"; data: { kind: "mail_results"; items: MailItem[]; summary?: string } }
  | { type: "agent_response"; tool_used: "calendar_get_today_agenda"; data: { kind: "calendar_agenda"; items: CalendarEvent[]; summary?: string } }
  | { type: "agent_response"; tool_used: "docs_list_recent_files"; data: { kind: "recent_files"; items: RecentFile[]; summary?: string } }
  | { type: "agent_response"; tool_used: "approval_list_pending"; data: { kind: "approvals"; items: ApprovalAction[] } }
  | { type: "connect_required"; provider: "microsoft"; connect_url: string; message: string }
  | { type: "approval_required"; approval: ApprovalAction; message: string }
  | { type: "not_implemented"; module: "teams" | "docs" | "mail" | "calendar"; message: string }
  | { type: "error"; error: { code: string; message: string } };

export function normalizeAgentResponse(raw: any): AgentChatResponse {
  // basic type casting placeholder, assumes backend returns correct shape
  return raw as AgentChatResponse;
}
