"use client";

import { useCanvas } from "./CanvasContext";
import { X } from "lucide-react";
import { EmailCanvas } from "./EmailCanvas";
import { MeetingCanvas } from "./MeetingCanvas";
import { DocumentCanvas } from "./DocumentCanvas";

export function ExecutionCanvasContainer() {
  const { activeCanvas, closeCanvas } = useCanvas();

  if (!activeCanvas) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[85vh] bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header rail */}
        <div className="absolute top-0 right-0 p-4 z-10">
          <button 
            onClick={closeCanvas}
            className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/60 transition-all backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden h-full">
          {activeCanvas === "email" && <EmailCanvas />}
          {activeCanvas === "meeting" && <MeetingCanvas />}
          {activeCanvas === "document" && <DocumentCanvas />}
        </div>
      </div>
    </div>
  );
}
