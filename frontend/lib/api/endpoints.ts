export const endpoints = {
  health: "/health",
  sessionMe: "/auth/session/me",
  sessionBootstrap: "/auth/session/bootstrap",
  sessionLogout: "/auth/session/logout",
  microsoftStatus: "/auth/microsoft/status",
  microsoftStart: "/auth/microsoft/start",
  microsoftDisconnect: "/auth/microsoft/disconnect",
  agentChat: "/agent/chat",
  agentChatStream: "/agent/chat/stream",
  approvals: "/approvals",
  approvalApprove: (approvalId: string) => `/approvals/${approvalId}/approve`,
  approvalReject: (approvalId: string) => `/approvals/${approvalId}/reject`,
  uploadsCreate: "/uploads",
  reportsCreate: "/reports"
};
