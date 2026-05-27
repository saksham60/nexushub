"use client";

import { useCanvas } from "./CanvasContext";
import { FileText, MessageSquare, Sparkles, AlertCircle, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DocumentCanvas() {
  const { actionItem } = useCanvas();

  const metadata = (actionItem?.metadata || {}) as Record<string, any>;
  const title = actionItem?.title || "Unknown Document";
  const webUrl = metadata.webUrl as string | undefined;

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Document Preview */}
      <div className="w-1/2 border-r border-white/10 flex flex-col bg-white/[0.02]">
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate pr-4">
            <FileText className="h-5 w-5 text-blue-400 shrink-0" />
            <span className="font-medium text-sm truncate">{title}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
            disabled={!webUrl}
            onClick={() => {
              if (webUrl) window.open(webUrl, "_blank");
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open Source
          </Button>
        </div>
        <div className="flex-1 p-8 flex items-center justify-center bg-black/20">
          {/* Mock Document Render */}
          <div className="w-full max-w-md aspect-[1/1.4] bg-white rounded shadow-2xl flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-4 bg-blue-600/20" />
            <FileText className="h-16 w-16 text-zinc-300 mb-4" />
            <h3 className="text-zinc-800 font-serif text-xl mb-2 line-clamp-2">{title}</h3>
            <div className="w-3/4 h-2 bg-zinc-100 rounded mb-2" />
            <div className="w-full h-2 bg-zinc-100 rounded mb-2" />
            <div className="w-5/6 h-2 bg-zinc-100 rounded mb-6" />
            
            <div className="w-full space-y-2 mt-auto">
              <div className="w-full h-2 bg-zinc-100 rounded" />
              <div className="w-full h-2 bg-zinc-100 rounded" />
              <div className="w-2/3 h-2 bg-zinc-100 rounded" />
            </div>
            <p className="text-xs text-zinc-400 mt-8 font-medium">DOCUMENT PREVIEW</p>
          </div>
        </div>
      </div>

      {/* Right side: Intelligence */}
      <div className="w-1/2 p-6 flex flex-col h-full overflow-y-auto scrollbar-none">
        <h2 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Document Intelligence
        </h2>

        <div className="space-y-6">
          {/* AI Summary */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Summary</h3>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {actionItem?.description || "No detailed summary available for this document."}
            </div>
          </section>
        </div>

        {/* Action Input */}
        <div className="mt-auto pt-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ask a question about this document..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-4 text-sm text-muted-foreground focus:outline-none transition-all"
              disabled
            />
            <Button disabled size="icon" className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary/20 text-primary">
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Interactive Q&A is coming soon.</p>
        </div>
      </div>
    </div>
  );
}
