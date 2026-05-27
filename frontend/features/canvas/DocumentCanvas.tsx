"use client";

import { useCanvas } from "./CanvasContext";
import { FileText, MessageSquare, Sparkles, AlertCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DocumentCanvas() {
  const { actionItem } = useCanvas();

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Document Preview */}
      <div className="w-1/2 border-r border-white/10 flex flex-col bg-white/[0.02]">
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <span className="font-medium text-sm">{actionItem?.title || "Vendor Contract.pdf"}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <Share2 className="h-3 w-3 mr-1" /> Open in SharePoint
          </Button>
        </div>
        <div className="flex-1 p-8 flex items-center justify-center bg-black/20">
          {/* Mock Document Render */}
          <div className="w-full max-w-md aspect-[1/1.4] bg-white rounded shadow-2xl flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-4 bg-blue-600/20" />
            <FileText className="h-16 w-16 text-zinc-300 mb-4" />
            <h3 className="text-zinc-800 font-serif text-xl mb-2">{actionItem?.title || "Confidential Document"}</h3>
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
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Executive Summary</h3>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm leading-relaxed text-muted-foreground">
              {actionItem?.description || "This document outlines the standard renewal terms. There is a 5% price increase year-over-year. All other SLAs and compliance requirements remain unchanged from the previous agreement."}
            </div>
          </section>

          {/* Related Teams Signals */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Related Teams Signals
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[#464EB8]/30 bg-[#464EB8]/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-[#8B93FF]">Legal Team</span>
                  <span className="text-[10px] text-muted-foreground">Yesterday</span>
                </div>
                <p className="text-xs text-zinc-300">"Please review the Contoso renewal before EOD Friday. The 5% increase is standard and pre-approved by finance."</p>
              </div>
              <div className="p-3 rounded-lg border border-white/5 bg-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-zinc-300">Direct Message</span>
                  <span className="text-[10px] text-muted-foreground">2 hours ago</span>
                </div>
                <p className="text-xs text-zinc-400">"Are we signing the vendor contract today?"</p>
              </div>
            </div>
          </section>

          {/* Risk Factors */}
          <section>
            <h3 className="text-sm font-semibold text-red-400/80 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Risk Factors Detected
            </h3>
            <ul className="space-y-2">
              <li className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Termination clause requires 90 days notice, up from 60 days.
              </li>
              <li className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Data residency shifted to EU regions instead of US East.
              </li>
            </ul>
          </section>
        </div>

        {/* Action Input */}
        <div className="mt-auto pt-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ask a question about this document..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-4 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
            <Button size="icon" className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30">
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
