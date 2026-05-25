import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/queryKeys";
import { BackendHealthResponse } from "./types";
import { ensureUserId } from "@/lib/session/localUser";

export function useBackendHealth() {
  return useQuery<BackendHealthResponse>({
    queryKey: queryKeys.health(),
    queryFn: () => apiClient.get<BackendHealthResponse>(`${endpoints.health}?user_id=${encodeURIComponent(ensureUserId())}`),
    refetchInterval: 30_000,
    retry: 1,
  });
}
