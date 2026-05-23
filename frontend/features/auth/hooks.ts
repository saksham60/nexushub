import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { MicrosoftStatusResponse, MicrosoftDisconnectResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";

export function useMicrosoftStatus() {
  return useQuery<MicrosoftStatusResponse>({
    queryKey: queryKeys.microsoft.status(),
    queryFn: () => apiClient.get<MicrosoftStatusResponse>(endpoints.microsoftStatus),
    retry: 1,
  });
}

export function useConnectMicrosoft() {
  // We don't fetch this as an API request since it redirects the browser to start OAuth.
  return () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}${endpoints.microsoftStart}`;
  };
}

export function useDisconnectMicrosoft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<MicrosoftDisconnectResponse>(endpoints.microsoftDisconnect),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.microsoft.status(), {
        status: "ok",
        connected: false,
        provider: "microsoft"
      });
      queryClient.invalidateQueries({ queryKey: ["agent-result"] });
    },
  });
}
