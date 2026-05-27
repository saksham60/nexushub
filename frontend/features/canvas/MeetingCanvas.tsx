"use client";

import { useCanvas } from "./CanvasContext";
import { Calendar, Clock, Users, Sparkles, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MeetingCanvas() {
  const { actionItem } = useCanvas();

  const metadata = (actionItem?.metadata || {}) as Record<string, any>;
  const person = actionItem?.person || "Unknown Attendee";
  const title = actionItem?.title || "No Title";
  
  // Try to format dates from metadata if available
  let displayDate = "No date available";
  let displayTime = "";
  
  if (metadata.start && metadata.start.dateTime) {
    const d = new Date(metadata.start.dateTime);
    displayDate = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    displayTime = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div className="flex h-full bg-background/50 text-foreground">
      {/* Left side: Availability */}
      <div className="w-1/3 border-r border-white/10 p-6 flex flex-col bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Availability Check
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Availability Details</h4>
            <div className="space-y-4">
              {/* Attendee */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground">{person}</span>
                  <span className="text-muted-foreground">Availability unknown</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div className="h-full w-full bg-white/10" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-sm">
              <p className="text-amber-500 font-medium mb-1">Limited Data</p>
              <p className="text-muted-foreground">Free/busy API integration is required to show accurate availability.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Meeting Details */}
      <div className="w-2/3 p-6 flex flex-col h-full">
        <h2 className="text-xl font-medium text-foreground mb-6 flex items-center gap-2">
          Meeting Details
        </h2>

        <div className="flex-1 space-y-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Meeting Title</label>
              <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                {title}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Date & Time</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {displayDate} {displayTime ? `at ${displayTime}` : ""}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Attendees</label>
                <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm flex items-center gap-2 truncate">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">You, {person}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Context / Agenda</label>
              <textarea 
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm min-h-[120px] resize-none focus:outline-none text-muted-foreground"
                value={actionItem?.description || "No agenda provided."}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Close
            </Button>
            <div className="relative group">
              <Button disabled className="bg-[#464EB8]/50 text-white/50 border border-white/10">
                <Video className="mr-2 h-4 w-4" /> Schedule via Teams
              </Button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border">
                Calendar write approval not available yet.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
