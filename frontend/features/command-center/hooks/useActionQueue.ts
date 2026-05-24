import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/queryKeys";
import { ensureUserId } from "@/lib/session/localUser";
import { ActionItem, CommandCenterFeedResponse } from "../types";

export function useCommandCenterFeed() {
  return useQuery<CommandCenterFeedResponse>({
    queryKey: queryKeys.commandCenter.feed(),
    queryFn: () => {
      const query = new URLSearchParams({ user_id: ensureUserId() });
      return apiClient.get<CommandCenterFeedResponse>(`${endpoints.commandCenterFeed}?${query.toString()}`);
    },
    retry: 1,
  });
}

export function useActionQueue() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null);
  const feedQuery = useCommandCenterFeed();
  const items = useMemo(() => feedQuery.data?.items || [], [feedQuery.data?.items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  const selectedItemFromQueue = selectedItem
    ? items.find((item) => item.id === selectedItem.id)
    : null;
  const defaultSelectedItem = items.find((item) => item.priority === "high") || items[0] || null;
  const activeSelectedItem = selectedItemFromQueue || defaultSelectedItem;
  const sourceError = feedQuery.data?.errors ? Object.values(feedQuery.data.errors)[0] : null;

  return {
    items,
    filteredItems,
    counts: feedQuery.data?.counts,
    health: feedQuery.data?.health,
    mailboxEmail: feedQuery.data?.mailboxEmail,
    sourceErrors: feedQuery.data?.errors || {},
    isLoading: feedQuery.isLoading,
    isError: feedQuery.isError || Boolean(sourceError),
    errorMessage: (feedQuery.error as Error | null)?.message || sourceError || null,
    activeFilter,
    setActiveFilter,
    selectedItem: activeSelectedItem,
    setSelectedItem,
    refetch: feedQuery.refetch,
  };
}
