"use client";

import { useSession } from "@/features/session/hooks";
import { Loader2 } from "lucide-react";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading, isError } = useSession();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm max-w-md text-center">
          <h2 className="text-lg font-semibold text-red-700">Backend Unavailable</h2>
          <p className="mt-2 text-sm text-zinc-600">NexusHub backend is not reachable. Please start the backend on port 3001.</p>
        </div>
      </div>
    );
  }

  if (session?.status === "unauthenticated") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm max-w-md text-center">
          <h2 className="text-xl font-semibold text-zinc-900">Sign In Required</h2>
          <p className="mt-2 text-sm text-zinc-600">Please sign in to access NexusHub.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
