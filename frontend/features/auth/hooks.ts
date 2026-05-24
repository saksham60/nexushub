import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { MicrosoftStatusResponse, MicrosoftDisconnectResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { ensureUserId } from "@/lib/session/localUser";

function microsoftStatusUrl() {
  return `${endpoints.microsoftStatus}?user_id=${encodeURIComponent(ensureUserId())}`;
}

function microsoftDisconnectUrl() {
  return `${endpoints.microsoftDisconnect}?user_id=${encodeURIComponent(ensureUserId())}`;
}

function getBackendUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export function useMicrosoftStatus() {
  return useQuery<MicrosoftStatusResponse>({
    queryKey: queryKeys.microsoft.status(),
    queryFn: () => apiClient.get<MicrosoftStatusResponse>(microsoftStatusUrl()),
    retry: 1,
  });
}

export function useConnectMicrosoft() {
  // We don't fetch this as an API request since it redirects the browser to start OAuth.
  return () => {
    const userId = ensureUserId();
    window.location.href = `${getBackendUrl()}${endpoints.microsoftStart}?user_id=${encodeURIComponent(userId)}`;
  };
}

export function useDisconnectMicrosoft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<MicrosoftDisconnectResponse>(microsoftDisconnectUrl()),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.microsoft.status(), {
        connected: false,
        provider: "microsoft",
        connect_url: endpoints.microsoftStart,
      });
      queryClient.invalidateQueries({ queryKey: ["agent-result"] });
    },
  });
}
