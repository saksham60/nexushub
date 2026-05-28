"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { KnowledgeNode, KnowledgeEdge, KnowledgeGraphResponse } from "../types";

// Node styling logic
const NODE_COLORS: Record<string, string> = {
  user: "#3b82f6", // Blue
  person: "#3b82f6", // Blue
  email: "#f97316", // Orange
  meeting: "#a855f7", // Purple
  document: "#22c55e", // Green
  approval: "#ef4444", // Red
  automation: "#06b6d4", // Cyan
  topic: "#eab308", // Yellow
  project: "#eab308", // Yellow
};

interface Props {
  data: KnowledgeGraphResponse;
  onNodeClick: (node: KnowledgeNode) => void;
}

export function KnowledgeGraphViewer({ data, onNodeClick }: Props) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Format data for react-force-graph
  const graphData = {
    nodes: data.nodes.map(n => ({ ...n, val: n.type === "user" ? 5 : 2 })),
    links: data.links.map(l => ({ ...l, source: l.source, target: l.target })),
  };

  const handleNodeClick = useCallback(
    (node: any) => {
      // Center and zoom to node
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(8, 2000);
      }
      onNodeClick(node as KnowledgeNode);
    },
    [onNodeClick]
  );

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-950 overflow-hidden">
      {containerSize.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={containerSize.width}
          height={containerSize.height}
          graphData={graphData}
          nodeLabel="label"
          nodeColor={(node: any) => NODE_COLORS[node.type] || "#ffffff"}
          linkColor={() => "rgba(255,255,255,0.2)"}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={d => 0.005}
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.label;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y - bckgDimensions[1] / 2 - 8,
              bckgDimensions[0],
              bckgDimensions[1]
            );

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = NODE_COLORS[node.type] || "#ffffff";
            ctx.fillText(label, node.x, node.y - 8);
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fillStyle = NODE_COLORS[node.type] || "#ffffff";
            ctx.fill();
            
            // Soft glow
            ctx.shadowColor = NODE_COLORS[node.type] || "#ffffff";
            ctx.shadowBlur = 10;
          }}
        />
      )}
    </div>
  );
}
