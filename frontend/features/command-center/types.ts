export type ActionItemType = "email" | "calendar" | "document" | "approval" | "team" | "report";

export type ActionItem = {
  id: string;
  type: ActionItemType;
  title: string;
  description?: string;
  source?: string;
  person?: string;
  timeLabel?: string;
  priority: "high" | "medium" | "low";
  status?: "new" | "pending" | "approved" | "dismissed";
  primaryActionLabel: string;
  metadata?: Record<string, unknown>;
  originalItem?: any;
};

export type CommandCenterFeedHealth = {
  backend: "ok" | "error";
  mcp: "ok" | "partial" | "error";
  microsoft: "connected" | "disconnected" | "error";
};

export type CommandCenterFeedCounts = {
  repliesNeeded: number;
  meetingsToday: number;
  approvalsPending: number;
  filesToReview: number;
};

export type CommandCenterFeedResponse = {
  mailboxEmail: string | null;
  health: CommandCenterFeedHealth;
  counts: CommandCenterFeedCounts;
  items: ActionItem[];
  errors?: Record<string, string>;
};
