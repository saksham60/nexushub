import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query/queryKeys";
import { useSession } from "@/features/session/hooks";
import {
  KnowledgeEntityDetails,
  KnowledgeGraphResponse,
  NodeSource,
  NodeType,
} from "./types";

export type KnowledgeGraphFilters = {
  limit?: number;
  timeRange?: string;
  types?: NodeType[];
  sources?: NodeSource[];
};

type GraphEndpointParams = KnowledgeGraphFilters & {
  userId: string;
  workspaceId?: string | null;
};

export function useKnowledgeGraph(filters: KnowledgeGraphFilters = {}) {
  const { data: session } = useSession();
  const enabled = session?.status === "ok";
  const params = enabled
    ? {
        userId: session.user.id,
        workspaceId: session.workspace.id,
        ...filters,
      }
    : null;

  return useQuery<KnowledgeGraphResponse>({
    queryKey: queryKeys.knowledge.graph(params || filters),
    queryFn: () => apiClient.get<KnowledgeGraphResponse>(buildKnowledgeGraphEndpoint(params!)),
    enabled,
    retry: 1,
  });
}

export function useRefreshKnowledgeGraph(filters: KnowledgeGraphFilters = {}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!session || session.status !== "ok") {
        throw new Error("Session is unavailable.");
      }
      return apiClient.post<KnowledgeGraphResponse>(
        buildKnowledgeGraphEndpoint({
          userId: session.user.id,
          workspaceId: session.workspace.id,
          ...filters,
        }).replace(endpoints.knowledgeGraph, `${endpoints.knowledgeGraph}/refresh`)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", "graph"] });
    },
  });
}

export function useKnowledgeEntityDetails(entityId?: string | null) {
  const { data: session } = useSession();
  const enabled = Boolean(entityId && session?.status === "ok");
  const params =
    entityId && session?.status === "ok"
      ? {
          entityId,
          userId: session.user.id,
          workspaceId: session.workspace.id,
        }
      : null;

  return useQuery<KnowledgeEntityDetails>({
    queryKey: queryKeys.knowledge.entity(entityId),
    queryFn: () =>
      apiClient.get<KnowledgeEntityDetails>(
        buildKnowledgeEntityEndpoint(params!)
      ),
    enabled,
    retry: 1,
  });
}

export function buildKnowledgeGraphEndpoint(params: GraphEndpointParams) {
  const search = new URLSearchParams();
  search.set("user_id", params.userId);
  const workspaceId = normalizeGraphWorkspaceId(params.workspaceId);
  if (workspaceId) search.set("workspace_id", workspaceId);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.timeRange) search.set("timeRange", params.timeRange);
  if (params.types?.length) search.set("types", params.types.join(","));
  if (params.sources?.length) search.set("source", params.sources.join(","));
  return `${endpoints.knowledgeGraph}?${search.toString()}`;
}

export function buildKnowledgeEntityEndpoint({
  entityId,
  userId,
  workspaceId,
}: {
  entityId: string;
  userId: string;
  workspaceId?: string | null;
}) {
  const search = new URLSearchParams();
  search.set("user_id", userId);
  const normalizedWorkspaceId = normalizeGraphWorkspaceId(workspaceId);
  if (normalizedWorkspaceId) search.set("workspace_id", normalizedWorkspaceId);
  return `${endpoints.knowledgeGraph}/entities/${encodeURIComponent(entityId)}?${search.toString()}`;
}

export function normalizeGraphWorkspaceId(workspaceId?: string | null) {
  const value = workspaceId?.trim();
  if (!value || value.toLowerCase() === "default") return null;
  return value;
}
