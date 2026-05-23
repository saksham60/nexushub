"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export default function TeamsPage() {
  const { data, isError, error } = useQuery({
    queryKey: ["teams", "health"],
    queryFn: () => apiClient.get("/teams/health").catch((e) => { throw e; }),
    retry: false,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="TeamSpace"
        description="Monitor team activity, mentions, and collaborative tasks."
      />

      <div className="mt-8">
        <EmptyState 
          icon={<Users className="h-10 w-10 text-zinc-400" />}
          title="Teams Integration Not Active"
          description="Teams integration is prepared but disabled until Graph permissions are enabled on the backend."
        />
      </div>
    </div>
  );
}
