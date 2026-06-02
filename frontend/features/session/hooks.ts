import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SessionResponse } from "./types";
import { queryKeys } from "@/lib/query/queryKeys";
import { clearStoredUserId, ensureUserId } from "@/lib/session/localUser";

function getLocalSession(): SessionResponse {
  const userId = ensureUserId();
  return {
    status: "ok",
    user: {
      id: userId,
      email: "",
      display_name: "Workspace User",
    },
    workspace: {
      id: "default",
      name: "Microsoft 365 Workspace",
    },
  };
}

export function useSession() {
  return useQuery<SessionResponse>({
    queryKey: queryKeys.session.me(),
    queryFn: getLocalSession,
    retry: false,
  });
}

export function useBootstrapSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => getLocalSession(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.session.me(), data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      clearStoredUserId();
      return { status: "ok" };
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.session.me(), {
        status: "unauthenticated",
        error: { code: "UNAUTHENTICATED", message: "Please sign in." }
      });
      queryClient.clear(); // Clear other sensitive data
    },
  });
}
