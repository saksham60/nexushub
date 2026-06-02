export const queryKeys = {
  session: {
    me: () => ["session", "me"] as const,
  },
  health: () => ["health"] as const,
  healthDependencies: () => ["health", "dependencies"] as const,
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
  commandCenter: {
    feed: () => ["command-center", "feed"] as const,
  },
  uploads: {
    list: () => ["uploads", "list"] as const,
  },
  knowledge: {
    graph: (filters: Record<string, unknown>) => ["knowledge", "graph", filters] as const,
    entity: (entityId?: string | null) => ["knowledge", "entity", entityId] as const,
  },
};
