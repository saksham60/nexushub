"use client";

import React from "react";
import { ArrowRight, Loader2, Network } from "lucide-react";
import Link from "next/link";
import { useKnowledgeGraph } from "../hooks";

export function KnowledgeGraphWidget() {
  const graphQuery = useKnowledgeGraph({ limit: 10 });
  const data = graphQuery.data;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/50 p-6 transition-all hover:border-white/10">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
          <Network className="h-5 w-5" />
        </div>
        <h3 className="font-medium text-white">Workspace Intelligence</h3>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        {graphQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Mapping your workspace...</span>
          </div>
        ) : graphQuery.isError ? (
          <div className="text-center text-sm text-slate-500">
            Workspace graph is unavailable.
          </div>
        ) : data && data.stats.totalNodes > 0 ? (
          <div className="space-y-3">
            {(data.degraded || data.stale) && (
              <p className="text-xs text-amber-300">Some graph sources need attention.</p>
            )}
            <p className="text-sm text-slate-400">
              Your workspace graph connects{" "}
              <strong className="text-slate-200">{data.stats.totalNodes} entities</strong>{" "}
              across {data.stats.totalEdges} relationships.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-xs text-orange-400">
                {data.stats.emailCount} Emails
              </span>
              <span className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-xs text-purple-400">
                {data.stats.meetingCount} Meetings
              </span>
              <span className="rounded border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs text-green-400">
                {data.stats.documentCount} Docs
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-slate-500">No workspace graph data yet.</div>
        )}
      </div>

      <Link
        href="/knowledge"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
      >
        View Knowledge Graph <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
