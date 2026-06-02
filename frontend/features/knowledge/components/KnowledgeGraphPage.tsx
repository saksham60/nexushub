"use client";

import React, { useMemo, useState } from "react";
import { KnowledgeNode, NodeSource, NodeType } from "../types";
import { KnowledgeGraphViewer } from "./KnowledgeGraphViewer";
import { KnowledgeEntityDrawer } from "./KnowledgeEntityDrawer";
import { Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getFriendlyErrorMessage } from "@/lib/api/errors";
import { useKnowledgeGraph, useRefreshKnowledgeGraph } from "../hooks";

const TYPE_FILTERS: Array<{ id: NodeType; label: string; color: string }> = [
  { id: "person", label: "People", color: "bg-blue-500" },
  { id: "email", label: "Emails", color: "bg-orange-500" },
  { id: "meeting", label: "Meetings", color: "bg-purple-500" },
  { id: "document", label: "Docs", color: "bg-green-500" },
];

const SOURCE_FILTERS: Array<{ id: NodeSource; label: string }> = [
  { id: "outlook", label: "Outlook" },
  { id: "calendar", label: "Calendar" },
  { id: "onedrive", label: "OneDrive" },
];

const DEFAULT_TYPES: NodeType[] = ["user", "person", "email", "meeting", "document"];
const DEFAULT_SOURCES: NodeSource[] = ["outlook", "calendar", "onedrive"];

export function KnowledgeGraphPage() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedTypes, setSelectedTypes] = useState<NodeType[]>(DEFAULT_TYPES);
  const [selectedSources, setSelectedSources] = useState<NodeSource[]>(DEFAULT_SOURCES);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => ({
      limit: 50,
      timeRange,
      types: selectedTypes,
      sources: selectedSources,
    }),
    [selectedSources, selectedTypes, timeRange]
  );
  const graphQuery = useKnowledgeGraph(filters);
  const refreshGraph = useRefreshKnowledgeGraph(filters);
  const data = graphQuery.data;

  const handleAction = (action: any) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("canvas", action.canvasType);
    if (action.payload) {
      Object.entries(action.payload).forEach(([key, value]) => {
        params.set(`canvas_${key}`, String(value));
      });
    }
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  const handleRefresh = () => {
    refreshGraph.mutate();
  };

  const toggleType = (type: NodeType) => {
    setSelectedTypes((current) => {
      const next = current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type];
      return next.some((item) => item !== "user") ? ensureUserType(next) : current;
    });
  };

  const toggleSource = (source: NodeSource) => {
    setSelectedSources((current) => {
      const next = current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source];
      return next.length ? next : current;
    });
  };

  if (graphQuery.isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="mb-4 h-8 w-8 animate-spin" />
        <p>Loading workspace intelligence...</p>
      </div>
    );
  }

  if (graphQuery.isError || !data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-slate-400">
        <p className="mb-4">{getFriendlyErrorMessage(graphQuery.error)}</p>
        <button
          onClick={() => graphQuery.refetch()}
          className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 transition-colors hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  const hasGraph = data.stats.totalNodes > 0;

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full bg-slate-950">
      <div className="absolute left-6 top-6 z-10 w-80 rounded-xl border border-white/10 bg-slate-900/85 p-4 shadow-xl backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-white">Knowledge Graph</h1>
            <p className="text-sm text-slate-400">
              {data.stats.totalNodes} nodes, {data.stats.totalEdges} connections
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshGraph.isPending}
            title="Refresh graph"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshGraph.isPending ? "animate-spin" : ""}`} />
          </button>
        </div>

        {(data.degraded || data.stale) && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            {data.message || "Some graph data is currently unavailable."}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time range
          </label>
          <select
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Types</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  selectedTypes.includes(type.id)
                    ? "border-white/15 bg-white/10 text-slate-100"
                    : "border-white/5 bg-white/[0.03] text-slate-500"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${type.color}`} />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_FILTERS.map((source) => (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  selectedSources.includes(source.id)
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-white/5 bg-white/[0.03] text-slate-500"
                }`}
              >
                {source.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          {Object.values(data.sourceStatus || {}).map((status) => (
            <div key={status.source} className="flex items-center justify-between text-slate-400">
              <span className="capitalize">{status.source}</span>
              <span className={sourceStatusClass(status.status)}>
                {status.status === "ok" ? `${status.count} items` : status.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {hasGraph ? (
        <KnowledgeGraphViewer
          data={data}
          selectedNodeId={selectedNode?.id}
          onNodeClick={setSelectedNode}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-center text-slate-500">
          <div>
            <p className="text-base font-medium text-slate-300">No graph data yet</p>
            <p className="mt-1 text-sm">Connect Microsoft 365 or broaden the filters.</p>
          </div>
        </div>
      )}

      <KnowledgeEntityDrawer
        entity={selectedNode}
        onClose={() => setSelectedNode(null)}
        onAction={handleAction}
      />
    </div>
  );
}

function ensureUserType(types: NodeType[]): NodeType[] {
  return types.includes("user") ? types : ["user", ...types];
}

function sourceStatusClass(status: string) {
  if (status === "ok") return "text-emerald-300";
  if (status === "error") return "text-amber-300";
  return "text-slate-500";
}
