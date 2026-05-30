"use client";

import React, { useState, useEffect } from "react";
import { KnowledgeGraphResponse, KnowledgeNode } from "../types";
import { KnowledgeGraphViewer } from "./KnowledgeGraphViewer";
import { KnowledgeEntityDrawer } from "./KnowledgeEntityDrawer";
import { Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/features/session/hooks";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export function KnowledgeGraphPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<KnowledgeGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const searchParams = useSearchParams();

  const fetchData = async () => {
    if (!session || session.status !== "ok") return;
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient.get<KnowledgeGraphResponse>(`${endpoints.knowledgeGraph}?user_id=${session.user.id}&workspace_id=${session.workspace.id}`);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && session.status === "ok") {
      fetchData();
    }
  }, [session]);

  const handleAction = (action: any) => {
    // Open the execution canvas via URL or context
    const params = new URLSearchParams(searchParams.toString());
    params.set("canvas", action.canvasType);
    if (action.payload) {
      Object.entries(action.payload).forEach(([k, v]) => {
        params.set(`canvas_${k}`, String(v));
      });
    }
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading Workspace Intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <p className="mb-4">Failed to load Knowledge Graph.</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] relative flex">
      {/* Legend & Stats Overlay */}
      <div className="absolute top-6 left-6 z-10 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl">
        <h1 className="text-white font-semibold text-lg mb-1">Knowledge Graph</h1>
        <p className="text-slate-400 text-sm mb-4">
          {data.stats.totalNodes} Nodes • {data.stats.totalEdges} Connections
        </p>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> <span className="text-slate-300">People ({data.stats.peopleCount})</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /> <span className="text-slate-300">Emails ({data.stats.emailCount})</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /> <span className="text-slate-300">Meetings ({data.stats.meetingCount})</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /> <span className="text-slate-300">Documents ({data.stats.documentCount})</span></div>
        </div>
      </div>

      <KnowledgeGraphViewer data={data} onNodeClick={setSelectedNode} />

      <KnowledgeEntityDrawer 
        entity={selectedNode} 
        onClose={() => setSelectedNode(null)} 
        onAction={handleAction} 
      />
    </div>
  );
}
