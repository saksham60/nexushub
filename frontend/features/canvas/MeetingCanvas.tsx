"use client";

import { useCanvas } from "./CanvasContext";
import { Calendar, Clock, Users, Sparkles, Video, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MeetingCanvas() {
  const { actionItem } = useCanvas();

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Availability */}
      <div className="w-1/3 border-r border-white/10 p-6 flex flex-col bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Availability Check
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Today, Oct 24</h4>
            <div className="space-y-4">
              {/* Attendee 1 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">You</span>
                  <span className="text-emerald-400">Free 2:00 PM - 4:00 PM</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full w-1/4 bg-red-500/50" />
                  <div className="h-full w-1/2 bg-emerald-500/50" />
                  <div className="h-full w-1/4 bg-blue-500/50" />
                </div>
              </div>
              
              {/* Attendee 2 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">{actionItem?.person || "Daisy Phillips"}</span>
                  <span className="text-emerald-400">Free 2:30 PM - 5:00 PM</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full w-1/3 bg-red-500/50" />
                  <div className="h-full w-2/3 bg-emerald-500/50" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div className="text-sm">
              <p className="text-primary font-medium mb-1">Recommended Time</p>
              <p className="text-muted-foreground">Both attendees are free today at 2:30 PM - 3:00 PM.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Meeting Details */}
      <div className="w-2/3 p-6 flex flex-col h-full">
        <h2 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
          Schedule Follow-up
        </h2>

        <div className="flex-1 space-y-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Meeting Title</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                Discuss: {actionItem?.title || "Q3 Budget Proposal"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Date & Time</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Today, 2:30 PM (30 min)
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Attendees</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  You, {actionItem?.person || "Daisy Phillips"}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Context / Agenda</label>
              <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm min-h-[120px] resize-none focus:outline-none focus:border-primary/50"
                defaultValue={`Hi ${actionItem?.person?.split(' ')[0] || "Daisy"},\n\nLet's sync briefly regarding the ${actionItem?.title || "Q3 Budget Proposal"}. I'd like to align on the marketing spend adjustments before final approval.\n\nBest,\nNexusHub`}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button className="bg-[#464EB8] text-white hover:bg-[#464EB8]/90 shadow-[0_0_15px_rgba(70,78,184,0.3)]">
            <Video className="mr-2 h-4 w-4" /> Schedule via Teams
          </Button>
        </div>
      </div>
    </div>
  );
}
