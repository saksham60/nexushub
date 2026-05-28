import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/queryKeys";
import { ActionItem, CommandCenterFeedCounts, CommandCenterFeedResponse } from "@/features/command-center/types";
import { ApprovalAction, PaginatedResponse } from "./types";
import { normalizeApprovalId } from "./ids";

export function removeApprovalFromCommandCenterFeed(
  feed: CommandCenterFeedResponse | undefined,
  approvalId: string,
): CommandCenterFeedResponse | undefined {
  if (!feed) return feed;
  const normalizedApprovalId = normalizeApprovalId(approvalId);
  const nextItems = feed.items.filter(
    (item) => itemApprovalId(item) !== normalizedApprovalId,
  );

  if (nextItems.length === feed.items.length) return feed;

  return {
    ...feed,
    items: nextItems,
    counts: updateCountsAfterRemoval(feed.counts, feed.items, nextItems),
  };
}

export function clearResolvedApprovalFromCaches(
  queryClient: QueryClient,
  approvalId: string,
  response?: unknown,
) {
  const resolvedApprovalId = normalizeApprovalId(responseApprovalId(response) || approvalId);

  queryClient.setQueryData<CommandCenterFeedResponse>(
    queryKeys.commandCenter.feed(),
    (feed) => removeApprovalFromCommandCenterFeed(feed, resolvedApprovalId),
  );

  queryClient.setQueriesData<PaginatedResponse<ApprovalAction>>(
    { queryKey: ["approvals"] },
    (page) => {
      if (!page) return page;
      return {
        ...page,
        items: page.items.filter(
          (approval) => normalizeApprovalId(approval.id) !== resolvedApprovalId,
        ),
      };
    },
  );

  queryClient.invalidateQueries({ queryKey: queryKeys.commandCenter.feed() });
  queryClient.invalidateQueries({ queryKey: ["approvals"] });
}

function itemApprovalId(item: ActionItem) {
  return normalizeApprovalId(
    item.metadata?.id ||
      item.metadata?.approval_id ||
      item.metadata?.approvalId ||
      item.id,
  );
}

function responseApprovalId(response: unknown) {
  if (!response || typeof response !== "object") return "";
  const approval = response as { id?: unknown; approval_id?: unknown; approvalId?: unknown };
  return String(approval.id || approval.approval_id || approval.approvalId || "");
}

function updateCountsAfterRemoval(
  counts: CommandCenterFeedCounts,
  previousItems: ActionItem[],
  nextItems: ActionItem[],
) {
  const removedItems = previousItems.filter(
    (item) => !nextItems.some((nextItem) => nextItem.id === item.id),
  );
  return removedItems.reduce<CommandCenterFeedCounts>((nextCounts, item) => {
    if (item.type === "email") {
      return { ...nextCounts, repliesNeeded: decrement(nextCounts.repliesNeeded) };
    }
    if (item.type === "calendar") {
      return { ...nextCounts, meetingsToday: decrement(nextCounts.meetingsToday) };
    }
    if (item.type === "approval") {
      return { ...nextCounts, approvalsPending: decrement(nextCounts.approvalsPending) };
    }
    if (item.type === "document") {
      return { ...nextCounts, filesToReview: decrement(nextCounts.filesToReview) };
    }
    if (item.type === "team") {
      return { ...nextCounts, teamsMentions: decrement(nextCounts.teamsMentions || 0) };
    }
    return { ...nextCounts, aiSuggestions: decrement(nextCounts.aiSuggestions) };
  }, counts);
}

function decrement(value: number) {
  return Math.max(0, value - 1);
}
