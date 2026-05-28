"use client";

import React, { useState, useEffect } from "react";
import { KnowledgeGraphResponse } from "../types";
import { Network, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function KnowledgeGraphWidget() {
  const [data, setData] = useState<KnowledgeGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/knowledge-graph?user_id=default_user&workspace_id=default_workspace&limit=10");
        if (response.ok) {
          setData(await response.json());
        }
      } catch (err) {
        console.error("Failed to load widget graph data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col h-full relative overflow-hidden group hover:border-white/10 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
          <Network className="w-5 h-5" />
        </div>
        <h3 className="text-white font-medium">Workspace Intelligence</h3>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Mapping your workspace...</span>
          </div>
        ) : data && data.stats.totalNodes > 0 ? (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">
              Your workspace graph connects <strong className="text-slate-200">{data.stats.totalNodes} entities</strong> across {data.stats.totalEdges} relationships.
            </p>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded border border-orange-500/20">{data.stats.emailCount} Emails</span>
              <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded border border-purple-500/20">{data.stats.meetingCount} Meetings</span>
              <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">{data.stats.documentCount} Docs</span>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-sm text-center">
            No workspace graph data yet.
          </div>
        )}
      </div>

      <Link href="/knowledge" className="mt-6 flex items-center justify-center w-full gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 transition-colors rounded-xl font-medium text-sm">
        View Knowledge Graph <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
