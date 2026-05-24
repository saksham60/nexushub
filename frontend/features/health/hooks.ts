import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/queryKeys";
import { BackendHealthResponse } from "./types";

export function useBackendHealth() {
  return useQuery<BackendHealthResponse>({
    queryKey: queryKeys.health(),
    queryFn: () => apiClient.get<BackendHealthResponse>(endpoints.health),
    refetchInterval: 30_000,
    retry: 1,
  });
}
