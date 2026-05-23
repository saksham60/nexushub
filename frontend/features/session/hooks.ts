import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { SessionResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";

export function useSession() {
  return useQuery<SessionResponse>({
    queryKey: queryKeys.session.me(),
    queryFn: () => apiClient.get<SessionResponse>(endpoints.sessionMe),
    retry: false, // Don't retry if unauthenticated
  });
}

export function useBootstrapSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.post<SessionResponse>(endpoints.sessionBootstrap),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.session.me(), data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post(endpoints.sessionLogout),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.session.me(), {
        status: "unauthenticated",
        error: { code: "UNAUTHENTICATED", message: "Please sign in." }
      });
      queryClient.clear(); // Clear other sensitive data
    },
  });
}
