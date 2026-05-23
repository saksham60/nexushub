"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { useApprovals, useApproveAction, useRejectAction } from "@/features/approvals/hooks";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PaginationControls } from "@/components/common/PaginationControls";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { CheckSquare, Check, X, Calendar, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [cursor, setCursor] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useApprovals({
    status: statusFilter,
    limit: 20,
    cursor,
  });

  const approveAction = useApproveAction();
  const rejectAction = useRejectAction();

  const handleTabChange = (value: string) => {
    setStatusFilter(value);
    setCursor(null);
  };

  const getPreviewIcon = (kind: string) => {
    switch (kind) {
      case "email_draft": return <Mail className="h-5 w-5 text-blue-500" />;
      case "calendar_event": return <Calendar className="h-5 w-5 text-green-500" />;
      default: return <FileText className="h-5 w-5 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="Approvals"
        description="Review actions drafted by NexusHub before they are executed."
        action={
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
        }
      />

      <Tabs defaultValue="pending" onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="executed">Executed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <LoadingState text="Loading approvals..." className="py-16" />
          ) : isError ? (
            <ErrorState title="Failed to load approvals" onRetry={() => refetch()} className="m-8" />
          ) : !data || data.items.length === 0 ? (
            <EmptyState 
              icon={<CheckSquare className="h-12 w-12 text-zinc-300" />}
              title={`No ${statusFilter === 'all' ? '' : statusFilter} approvals`}
              description="You have no actions waiting for your review in this category."
              className="py-16 border-none"
            />
          ) : (
            <div>
              <div className="divide-y divide-zinc-100">
                {data.items.map((approval) => (
                  <div key={approval.id} className="p-6 transition-colors hover:bg-zinc-50 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getPreviewIcon(approval.preview.kind)}
                          <h3 className="text-base font-medium text-zinc-900">
                            {approval.preview.kind === "email_draft" ? "Draft Email" : 
                             approval.preview.kind === "calendar_event" ? "Schedule Event" : 
                             (approval.preview as any).title || approval.action_type}
                          </h3>
                        </div>
                        <StatusBadge status={approval.status} />
                      </div>
                      
                      <div className="pl-8 bg-zinc-50 border border-zinc-100 p-4 rounded-lg text-sm text-zinc-600">
                        {approval.preview.kind === "email_draft" && (
                          <div className="space-y-2">
                            <p><span className="font-medium text-zinc-700">To:</span> {approval.preview.to.join(", ")}</p>
                            <p><span className="font-medium text-zinc-700">Subject:</span> {approval.preview.subject}</p>
                            <p className="pt-2 border-t border-zinc-200">{approval.preview.body_preview}</p>
                          </div>
                        )}
                        {approval.preview.kind === "calendar_event" && (
                          <div className="space-y-2">
                            <p><span className="font-medium text-zinc-700">Title:</span> {approval.preview.title}</p>
                            <p><span className="font-medium text-zinc-700">Time:</span> {new Date(approval.preview.start).toLocaleString()} - {new Date(approval.preview.end).toLocaleString()}</p>
                          </div>
                        )}
                        {approval.preview.kind === "generic" && (
                          <div>
                            <p>{approval.preview.description}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-zinc-400 pl-8">
                        Created {new Date(approval.created_at).toLocaleString()} • ID: {approval.id.slice(0,8)}
                      </div>
                    </div>
                    
                    {approval.status === "pending" && (
                      <div className="flex md:flex-col gap-2 pt-2 md:pt-0">
                        <Button 
                          onClick={() => approveAction.mutate(approval.id)}
                          disabled={approveAction.isPending || rejectAction.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                        >
                          <Check className="w-4 h-4 mr-2" /> Approve
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => rejectAction.mutate(approval.id)}
                          disabled={approveAction.isPending || rejectAction.isPending}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-1 md:flex-none"
                        >
                          <X className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-6 border-t border-zinc-100">
                <PaginationControls 
                  pageInfo={data.page_info}
                  onNext={(c) => setCursor(c)}
                  onPrev={(c) => setCursor(c)}
                />
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
