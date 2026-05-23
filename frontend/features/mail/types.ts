export type MailItem = {
  id: string;
  subject: string;
  from: {
    name?: string;
    email: string;
  };
  received_at: string;
  preview: string;
  importance?: "low" | "normal" | "high";
  is_read?: boolean;
  reason?: string;
  suggested_action?: string;
};
