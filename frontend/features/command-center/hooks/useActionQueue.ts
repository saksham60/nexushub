import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/queryKeys";
import { ActionItem } from "../types";
import { MailItem } from "@/features/mail/types";
import { CalendarEvent } from "@/features/calendar/types";
import { RecentFile } from "@/features/docs/types";
import { ApprovalAction } from "@/features/approvals/types";
import { useApprovals } from "@/features/approvals/hooks";
import { useState, useMemo } from "react";

export function useActionQueue() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);

  // Fetch from existing endpoints
  const mailQuery = useQuery<{ items: MailItem[] }>({
    queryKey: queryKeys.agent.result("mail_find_needs_reply"),
    enabled: true,
  });

  const calendarQuery = useQuery<{ items: CalendarEvent[] }>({
    queryKey: queryKeys.agent.result("calendar_get_today_agenda"),
    enabled: true,
  });

  const docsQuery = useQuery<{ items: RecentFile[] }>({
    queryKey: queryKeys.agent.result("docs_list_recent_files"),
    enabled: true,
  });

  const approvalsQuery = useApprovals({ status: "pending", limit: 20 });

  const isLoading = mailQuery.isLoading || calendarQuery.isLoading || docsQuery.isLoading || approvalsQuery.isLoading;
  const isError = mailQuery.isError || calendarQuery.isError || docsQuery.isError || approvalsQuery.isError;

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
          let title = approval.action_type;
          if (approval.preview.kind === "email_draft") title = "Draft Email";
          if (approval.preview.kind === "calendar_event") title = "Schedule Event";
          if ((approval.preview as any).title) title = (approval.preview as any).title;

          return {
            id: `app_${approval.id}`,
            type: "approval",
            title: title,
            description: "Pending approval request",
            source: "NexusHub",
            priority: "high",
            status: "pending",
            primaryActionLabel: "Review",
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
    activeFilter,
    setActiveFilter,
    selectedItem: activeSelectedItem,
    setSelectedItem,
    refetch,
  };
}
