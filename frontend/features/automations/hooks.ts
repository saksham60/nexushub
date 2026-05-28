import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { AutomationsResponse } from "./types";

export function useAutomations() {
  return useQuery<AutomationsResponse>({
    queryKey: ["automations"],
    queryFn: () => apiClient.get<AutomationsResponse>(endpoints.automations),
    retry: 1,
  });
}
