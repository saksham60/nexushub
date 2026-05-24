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
