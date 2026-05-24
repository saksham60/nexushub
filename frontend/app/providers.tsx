"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query/queryClient";
import { syncUserIdFromCallbackUrl } from "@/lib/session/localUser";
import { ReactNode, useEffect } from "react";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const syncedUserId = syncUserIdFromCallbackUrl();
    if (syncedUserId) {
      queryClient.invalidateQueries({ queryKey: ["microsoft"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
