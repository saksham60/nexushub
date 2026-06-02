export type HealthDependency = {
  status: "ok" | "degraded" | "unreachable" | "warming" | "not_checked" | "unknown" | "connected" | "disconnected" | "error";
  service?: string;
  mode?: string;
  transport?: string;
  tools?: {
    count?: number;
    categories?: Array<{ name: string; tools: string[] }>;
  };
  error?: {
    code: string;
    message: string;
  };
};

export type BackendHealthResponse = {
  status: "ok" | "degraded" | "unhealthy";
  service: string;
  backend: {
    status: "ok";
    service: string;
    url?: string;
  };
  dependencies: {
    mcp?: HealthDependency;
    microsoft?: HealthDependency & { email?: string };
  };
};
