export const endpoints = {
  health: "/health",
  microsoftStatus: "/auth/microsoft/status",
  microsoftStart: "/auth/microsoft/start",
  microsoftDisconnect: "/auth/microsoft/disconnect",
  agentChat: "/agent/chat",
  approvals: "/approvals",
  approvalApprove: (approvalId: string) => `/approvals/${approvalId}/approve`,
  approvalReject: (approvalId: string) => `/approvals/${approvalId}/reject`,
};
