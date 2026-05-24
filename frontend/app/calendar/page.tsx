"use client";

import { PageHeader } from "@/components/common/PageHeader";
import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
import { SuggestedPromptChips } from "@/components/agent/SuggestedPromptChips";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/queryKeys";
import { CalendarEvent } from "@/features/calendar/types";
import { EmptyState } from "@/components/common/EmptyState";
import { Calendar as CalendarIcon, Clock, MapPin, Users } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";

export default function CalendarPage() {
  const { data: results } = useQuery<{ kind: string; items: CalendarEvent[]; summary?: string }>({
    queryKey: queryKeys.agent.result("calendar_get_today_agenda"),
    enabled: true,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        title="DayPilot"
        description="Plan your day, prepare for meetings, and protect your focus time."
      />

      <div className="max-w-3xl space-y-4">
        <AgentCommandBar />
        <SuggestedPromptChips 
          prompts={[
            "Show my agenda for today",
            "Find focus blocks",
            "Prepare me for my next meeting"
          ]}
          onSelect={(p) => {
            const input = document.querySelector<HTMLInputElement>('input[name="command"]');
            if (input) input.value = p;
          }}
        />
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-medium text-zinc-900 mb-6">Today&apos;s Agenda</h2>
        
        {!results || !results.items || results.items.length === 0 ? (
          <EmptyState 
            icon={<CalendarIcon className="h-10 w-10" />}
            title="No events loaded"
            description="Use the command bar to ask NexusHub for your agenda or to find focus time."
          />
        ) : (
          <div className="relative border-l border-zinc-200 ml-4 md:ml-6 space-y-8 pb-4">
            {results.items.map((event) => {
              const startDate = new Date(event.start);
              const endDate = new Date(event.end);
              const timeString = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div key={event.id} className="relative pl-8 md:pl-10">
                  <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-blue-600 bg-white" />
                  
                  <SectionCard title={event.subject} description={timeString} className="hover:border-blue-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8 text-sm text-zinc-600">
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      {event.organizer && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 shrink-0 text-zinc-400" />
                          <span>{event.organizer.name || event.organizer.email}</span>
                        </div>
                      )}
                    </div>
                    
                    {event.preparation_notes && event.preparation_notes.length > 0 && (
                      <div className="mt-4 p-4 bg-zinc-50 rounded-lg text-sm border border-zinc-100">
                        <div className="flex items-center gap-2 mb-2 font-medium text-zinc-800">
                          <Clock className="h-4 w-4 text-blue-600" />
                          Preparation Notes
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                          {event.preparation_notes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </SectionCard>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
