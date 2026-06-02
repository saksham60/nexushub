"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { KnowledgeGraphResponse, KnowledgeNode } from "../types";

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
  selectedNodeId?: string;
  onNodeClick: (node: KnowledgeNode) => void;
}

export function KnowledgeGraphViewer({ data, selectedNodeId, onNodeClick }: Props) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const updateSize = () =>
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(
    () => ({
      nodes: data.nodes.map((node) => ({
        ...node,
        val: node.type === "user" ? 6 : node.type === "person" ? 3.5 : 2.6,
      })),
      links: data.links.map((link) => ({
        ...link,
        source: link.source,
        target: link.target,
      })),
    }),
    [data.links, data.nodes]
  );

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
          linkColor={(link: any) =>
            link.sourceSystem === "nexushub"
              ? "rgba(148,163,184,0.15)"
              : "rgba(255,255,255,0.25)"
          }
          linkWidth={(link: any) => Math.max(0.4, Math.min(Number(link.weight || 1), 4))}
          linkDirectionalParticles={(link: any) => (Number(link.weight || 0) >= 0.7 ? 2 : 0)}
          linkDirectionalParticleSpeed={(link: any) =>
            Math.max(0.002, Math.min(Number(link.weight || 1) * 0.004, 0.012))
          }
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.label;
            const color = NODE_COLORS[node.type] || "#ffffff";
            const isSelected = node.id === selectedNodeId;
            const radius = Number(node.val || 2) * (isSelected ? 1.5 : 1);
            const fontSize = Math.max(3, 12 / globalScale);
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.save();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(2, 6, 23, 0.82)";
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y - bckgDimensions[1] / 2 - radius - 6,
              bckgDimensions[0],
              bckgDimensions[1]
            );

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = color;
            ctx.fillText(label, node.x, node.y - radius - 6);
            ctx.restore();

            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = isSelected ? 18 : 8;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
            if (isSelected) {
              ctx.lineWidth = 1.6 / globalScale;
              ctx.strokeStyle = "#ffffff";
              ctx.stroke();
            }
            ctx.restore();
          }}
        />
      )}
    </div>
  );
}
