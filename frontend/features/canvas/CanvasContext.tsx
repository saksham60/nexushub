"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ActionItem } from "@/features/command-center/types";

export type CanvasType = "email" | "meeting" | "document" | "approval" | "automation" | null;

interface CanvasContextType {
  activeCanvas: CanvasType;
  actionItem: ActionItem | null;
  canvasPayload: Record<string, unknown> | null;
  isCanvasMinimized: boolean;
  openCanvas: (
    type: CanvasType,
    item?: ActionItem | null,
    payload?: Record<string, unknown> | null,
  ) => void;
  closeCanvas: () => void;
  minimizeCanvas: () => void;
  restoreCanvas: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [activeCanvas, setActiveCanvas] = useState<CanvasType>(null);
  const [actionItem, setActionItem] = useState<ActionItem | null>(null);
  const [canvasPayload, setCanvasPayload] = useState<Record<string, unknown> | null>(null);
  const [isCanvasMinimized, setIsCanvasMinimized] = useState(false);

  const openCanvas = (
    type: CanvasType,
    item: ActionItem | null = null,
    payload: Record<string, unknown> | null = null,
  ) => {
    setActiveCanvas(type);
    setActionItem(item);
    setCanvasPayload(payload);
    setIsCanvasMinimized(false);
  };

  const closeCanvas = () => {
    setActiveCanvas(null);
    setActionItem(null);
    setCanvasPayload(null);
    setIsCanvasMinimized(false);
  };

  const minimizeCanvas = () => {
    if (activeCanvas) {
      setIsCanvasMinimized(true);
    }
  };

  const restoreCanvas = () => {
    setIsCanvasMinimized(false);
  };

  return (
    <CanvasContext.Provider
      value={{
        activeCanvas,
        actionItem,
        canvasPayload,
        isCanvasMinimized,
        openCanvas,
        closeCanvas,
        minimizeCanvas,
        restoreCanvas,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}
