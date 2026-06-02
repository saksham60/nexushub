import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/queryKeys";
import { BackendHealthResponse } from "./types";
import { ensureUserId } from "@/lib/session/localUser";

export function useBackendHealth() {
  return useQuery<BackendHealthResponse>({
    queryKey: queryKeys.health(),
    queryFn: () => apiClient.get<BackendHealthResponse>(endpoints.health),
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useBackendDependencyHealth() {
  return useQuery<BackendHealthResponse>({
    queryKey: queryKeys.healthDependencies(),
    queryFn: () => {
      const query = new URLSearchParams({
        user_id: ensureUserId(),
        mcp_timeout_ms: "900",
      });
      return apiClient.get<BackendHealthResponse>(
        `${endpoints.healthDependencies}?${query.toString()}`
      );
    },
    refetchInterval: 60_000,
    retry: 0,
  });
}
