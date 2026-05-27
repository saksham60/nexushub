"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { ActionItem } from "@/features/command-center/types";

export type CanvasType = "email" | "meeting" | "document" | null;

interface CanvasContextType {
  activeCanvas: CanvasType;
  actionItem: ActionItem | null;
  openCanvas: (type: CanvasType, item?: ActionItem | null) => void;
  closeCanvas: () => void;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [activeCanvas, setActiveCanvas] = useState<CanvasType>(null);
  const [actionItem, setActionItem] = useState<ActionItem | null>(null);

  const openCanvas = (type: CanvasType, item: ActionItem | null = null) => {
    setActiveCanvas(type);
    setActionItem(item);
  };

  const closeCanvas = () => {
    setActiveCanvas(null);
    setActionItem(null);
  };

  return (
    <CanvasContext.Provider value={{ activeCanvas, actionItem, openCanvas, closeCanvas }}>
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
