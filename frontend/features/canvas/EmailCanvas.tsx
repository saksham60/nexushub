"use client";

import { useCanvas } from "./CanvasContext";
import { Mail, Sparkles, Send, Save, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailCanvas() {
  const { actionItem } = useCanvas();

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Original Thread */}
      <div className="w-1/3 border-r border-white/10 p-6 flex flex-col bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4" /> Original Thread
        </h3>
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-none space-y-6">
          <div className="space-y-1">
            <h4 className="text-lg font-medium text-foreground">{actionItem?.title || "Review Q3 Budget Proposal"}</h4>
            <p className="text-sm text-muted-foreground">From: {actionItem?.person || "Daisy Phillips"}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Daisy Phillips</span>
              <span className="text-xs text-muted-foreground">Today at 10:45 AM</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {actionItem?.description || "Hi team, please review the attached Q3 budget proposal. I've highlighted the changes in marketing spend. Let me know if you have any questions before the meeting."}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Composer */}
      <div className="w-2/3 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Draft Reply
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Tone: Professional, Concise
            </span>
          </div>
        </div>

        {/* Fake Rich Text Editor */}
        <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-card overflow-hidden shadow-sm">
          {/* Toolbar */}
          <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 gap-4">
            <div className="flex gap-2">
              <span className="text-muted-foreground font-serif font-bold text-sm cursor-pointer hover:text-foreground">B</span>
              <span className="text-muted-foreground font-serif italic text-sm cursor-pointer hover:text-foreground">I</span>
              <span className="text-muted-foreground font-serif underline text-sm cursor-pointer hover:text-foreground">U</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex gap-2 text-muted-foreground text-xs font-medium">
              <span className="cursor-pointer hover:text-foreground">Normal Text</span>
            </div>
          </div>
          
          {/* Textarea */}
          <textarea 
            className="flex-1 w-full bg-transparent p-4 text-sm leading-relaxed resize-none focus:outline-none text-foreground"
            defaultValue={`Hi Daisy,\n\nI've reviewed the Q3 budget proposal. The marketing spend adjustments look good and align with our strategy for the upcoming product launch.\n\nApproved from my side. Let's discuss the remaining items during the sync.\n\nBest,\nNexusHub`}
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Discard
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
              <Save className="mr-2 h-4 w-4" /> Save as Draft
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Send className="mr-2 h-4 w-4" /> Send Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
