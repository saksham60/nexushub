export const queryKeys = {
  session: {
    me: () => ["session", "me"] as const,
  },
  health: () => ["health"] as const,
  microsoft: {
    status: () => ["microsoft", "status"] as const,
  },
  approvals: {
    list: (filters: { status: string; limit: number; cursor?: string | null }) => 
      ["approvals", "list", filters] as const,
  },
  agent: {
    result: (toolName: string, params?: Record<string, any>) => 
      ["agent-result", toolName, params] as const,
  },
  uploads: {
    list: () => ["uploads", "list"] as const,
  }
};
