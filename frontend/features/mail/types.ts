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

export type DraftPreviewRequest = {
  original_message_id?: string | null;
  subject: string;
  recipients: string[];
  context: string;
  tone?: "professional" | "concise" | "friendly";
  intent?: string | null;
};

export type DraftPreviewResponse = {
  status: "approval_required";
  approvalId: string;
  draftBody: string;
  subject: string;
  recipients: string[];
  originalMessageId?: string | null;
  source?: string;
};

export type DraftCreateRequest = {
  originalMessageId?: string | null;
  draftBody: string;
  subject: string;
  recipients: string[];
  mailboxEmail?: string;
  approvalId?: string | null;
};

export type DraftCreateResponse = {
  success: boolean;
  outlookDraftId?: string | null;
  mailboxEmail: string;
  createdAt: string;
  webLink?: string | null;
  createdVia?: "reply_draft" | "standalone_draft" | string | null;
  replyFallbackReason?: string | null;
  simulated?: boolean;
  approvalId?: string | null;
};

export type DraftSendRequest = {
  outlookDraftId: string;
};

export type DraftSendResponse = {
  success: boolean;
  outlookDraftId: string;
  mailboxEmail: string;
  sentAt: string;
  recipients?: string[];
  subject?: string;
  deliveryStatus?: "accepted_by_outlook" | string;
  deliveryNote?: string;
  simulated?: boolean;
};

export type DraftReplyRequest = {
  messageId: string;
  subject: string;
  from: string;
  to: string[];
  bodyPreview: string;
  body: string;
  mailboxEmail: string;
  tone?: "professional" | "concise" | "friendly";
  userIntent?: string;
};

export type DraftReplyResponse = {
  draftSubject: string;
  draftBody: string;
  rationale: string;
  confidence: number;
  requiresApproval: boolean;
};
