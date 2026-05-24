export const endpoints = {
  health: "/health",
  commandCenterFeed: "/api/command-center/feed",
  microsoftStatus: "/auth/microsoft/status",
  microsoftStart: "/auth/microsoft/start",
  microsoftDisconnect: "/auth/microsoft/disconnect",
  agentChat: "/agent/chat",
  mailDraftReply: "/api/mail/draft-reply",
  mailDraftPreview: "/mail/drafts/preview",
  mailDraftCreate: "/mail/drafts",
  approvals: "/approvals",
  approvalApprove: (approvalId: string) => `/approvals/${approvalId}/approve`,
  approvalReject: (approvalId: string) => `/approvals/${approvalId}/reject`,
};
