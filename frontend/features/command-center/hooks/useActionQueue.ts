import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/queryKeys";
import { ActionItem } from "../types";
import { MailItem } from "@/features/mail/types";
import { CalendarEvent } from "@/features/calendar/types";
import { RecentFile } from "@/features/docs/types";
import { ApprovalAction } from "@/features/approvals/types";
import { useApprovals } from "@/features/approvals/hooks";
import { useState, useMemo } from "react";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeAgentResponse } from "@/features/agent/types";
import { getRequestIdentity } from "@/lib/session/localUser";

export function useActionQueue() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);

  // Fetch from existing endpoints
  const mailQuery = useQuery<{ items: MailItem[] }>({
    queryKey: queryKeys.agent.result("mail_find_needs_reply"),
    queryFn: () => fetchAgentItems<MailItem>("Find Outlook emails that need replies.", "mail_results"),
    enabled: true,
  });

  const calendarQuery = useQuery<{ items: CalendarEvent[] }>({
    queryKey: queryKeys.agent.result("calendar_get_today_agenda"),
    queryFn: () => fetchAgentItems<CalendarEvent>("Get today's calendar agenda.", "calendar_agenda"),
    enabled: true,
  });

  const docsQuery = useQuery<{ items: RecentFile[] }>({
    queryKey: queryKeys.agent.result("docs_list_recent_files"),
    queryFn: () => fetchAgentItems<RecentFile>("List recent files.", "recent_files"),
    enabled: true,
  });

  const approvalsQuery = useApprovals({ status: "pending", limit: 20 });

  const isLoading = mailQuery.isLoading || calendarQuery.isLoading || docsQuery.isLoading || approvalsQuery.isLoading;
  const isError = mailQuery.isError || calendarQuery.isError || docsQuery.isError || approvalsQuery.isError;
  const errorMessage =
    (mailQuery.error as Error | null)?.message ||
    (calendarQuery.error as Error | null)?.message ||
    (docsQuery.error as Error | null)?.message ||
    (approvalsQuery.error as Error | null)?.message ||
    null;

  const items = useMemo(() => {
    if (isLoading) return [];

    const actionItems: ActionItem[] = [];

    // Map Emails
    if (mailQuery.data?.items) {
      actionItems.push(
        ...mailQuery.data.items.map((mail): ActionItem => ({
          id: `mail_${mail.id}`,
          type: "email",
          title: mail.subject,
          description: mail.preview,
          source: "Outlook",
          person: mail.from.name || mail.from.email,
          timeLabel: new Date(mail.received_at).toLocaleDateString(),
          priority: mail.importance === "high" ? "high" : "medium",
          status: "new",
          primaryActionLabel: "Draft Reply",
          originalItem: mail,
        }))
      );
    }

    // Map Calendar
    if (calendarQuery.data?.items) {
      actionItems.push(
        ...calendarQuery.data.items.map((event): ActionItem => ({
          id: `cal_${event.id}`,
          type: "calendar",
          title: event.subject,
          description: event.location,
          source: "Calendar",
          person: event.organizer?.name || event.organizer?.email,
          timeLabel: new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          priority: "high",
          status: "pending",
          primaryActionLabel: "Prepare",
          originalItem: event,
        }))
      );
    }

    // Map Docs
    if (docsQuery.data?.items) {
      actionItems.push(
        ...docsQuery.data.items.map((doc): ActionItem => ({
          id: `doc_${doc.id}`,
          type: "document",
          title: doc.name,
          description: `${Math.round((doc.size_bytes || 0) / 1000)} KB`,
          source: doc.source || "OneDrive",
          priority: "low",
          status: "new",
          primaryActionLabel: "Summarize",
          originalItem: doc,
        }))
      );
    }

    // Map Approvals
    if (approvalsQuery.data?.items) {
      actionItems.push(
        ...approvalsQuery.data.items.map((approval: ApprovalAction): ActionItem => {
          const preview = approval.preview as any;
          let title = approval.action_type;
          if (approval.preview.kind === "email_draft") title = "Draft Email";
          if (approval.preview.kind === "calendar_event") title = "Schedule Event";
          if (preview.title) title = preview.title;

          return {
            id: `app_${approval.id}`,
            type: "approval",
            title: title,
            description: preview.body_preview || preview.description || "Pending approval request",
            source: "NexusHub",
            priority: "high",
            status: "pending",
            primaryActionLabel: approval.action_type === "mail.create_draft_reply" ? "Create Draft" : "Review",
            originalItem: approval,
          };
        })
      );
    }

    return actionItems;
  }, [
    mailQuery.data,
    calendarQuery.data,
    docsQuery.data,
    approvalsQuery.data,
    isLoading
  ]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((i) => i.type === activeFilter);
  }, [items, activeFilter]);

  const selectedItemFromQueue = selectedItem ? items.find((item) => item.id === selectedItem.id) : null;
  const defaultSelectedItem = items.find((item) => item.priority === "high") || items[0] || null;
  const activeSelectedItem = selectedItemFromQueue || defaultSelectedItem;

  const refetch = () => {
    mailQuery.refetch();
    calendarQuery.refetch();
    docsQuery.refetch();
    approvalsQuery.refetch();
  };

  return {
    items,
    filteredItems,
    isLoading,
    isError,
    errorMessage,
    activeFilter,
    setActiveFilter,
    selectedItem: activeSelectedItem,
    setSelectedItem,
    refetch,
  };
}

async function fetchAgentItems<T>(
  message: string,
  expectedKind: "mail_results" | "calendar_agenda" | "recent_files"
): Promise<{ items: T[] }> {
  const raw = await apiClient.post(endpoints.agentChat, {
    ...getRequestIdentity(),
    message,
  });
  const response = normalizeAgentResponse(raw);
  if (response.type === "connect_required") {
    throw new Error(response.message);
  }
  if (response.type === "error") {
    throw new Error(response.error.message);
  }
  if (response.type !== "agent_response" || response.data.kind !== expectedKind) {
    throw new Error("NexusHub returned an unexpected agent response.");
  }
  return { items: response.data.items as T[] };
}
