"use client";

import { useConnectMicrosoft, useMicrosoftStatus } from "@/features/auth/hooks";
import { Loader2, PlugZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const connectMicrosoft = useConnectMicrosoft();
  const { data: microsoftStatus, isLoading, isError, error } = useMicrosoftStatus();

  useEffect(() => {
    if (!isLoading && microsoftStatus?.connected === false) {
      router.replace("/");
    }
  }, [isLoading, microsoftStatus, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-lg border border-white/10 bg-card p-6 text-center">
          <PlugZap className="mx-auto mb-4 h-8 w-8 text-amber-300" />
          <h2 className="text-xl font-semibold">Backend connection required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {(error as Error | undefined)?.message || "NexusHub cannot verify your Microsoft 365 connection."}
          </p>
          <button
            onClick={() => router.replace("/")}
            className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground transition-colors hover:bg-white/10"
          >
            Return to landing
          </button>
        </div>
      </div>
    );
  }

  if (!microsoftStatus?.connected) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-lg border border-white/10 bg-card p-6 text-center">
          <PlugZap className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-xl font-semibold">Connect Microsoft 365</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            NexusHub unlocks the command center after your Microsoft workspace is connected.
          </p>
          <button
            onClick={() => connectMicrosoft()}
            className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continue with Microsoft
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
