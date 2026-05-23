export type PageInfo = {
  next_cursor: string | null;
  prev_cursor?: string | null;
  has_more: boolean;
  limit: number;
};

export type PaginatedResponse<T> = {
  status: "ok";
  items: T[];
  page_info: PageInfo;
};

export type ApprovalPreview =
  | { kind: "email_draft"; to: string[]; subject: string; body_preview: string }
  | { kind: "mark_read"; message_ids: string[]; count: number }
  | { kind: "calendar_event"; title: string; start: string; end: string }
  | { kind: "generic"; title: string; description: string; payload_summary?: Record<string, string> };

export type ApprovalAction = {
  id: string;
  tool_name: string;
  action_type: string;
  preview: ApprovalPreview;
  status: "pending" | "approved" | "rejected" | "executed";
  created_at: string;
};
